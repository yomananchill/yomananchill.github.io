Most security bugs live in code that was never meant to be safe. The interesting ones live right next to code that promised it would be.

Keras has such a promise. It is called `safe_mode`, it is on by default, and its whole job is to refuse any model-loading path that could run attacker code. When you load a model you did not build - off Hugging Face, out of a teammate's bucket, from a link in a paper - `safe_mode=True` is the thing standing between you and a `.keras` file that wants to own your machine.

I went looking for a place where that promise did not hold. I found `TFSMLayer`, and it does something worse than run code at load time: it waits, and runs the attacker's code later, during a completely ordinary inference call, long after anyone stopped watching.

## Reading at the edge of the promise

A security guarantee is only as good as the code that sits just outside it. `safe_mode` guards the deserialization paths Keras knows are dangerous - the ones that can reconstruct arbitrary Python objects. So I started reading the layers that load *external* things, on the theory that one of them wouldn't be routed through the check.

`TFSMLayer` wraps a saved TensorFlow model as a Keras layer. Its entire reason to exist is to load a SavedModel from a path. Here is what its constructor does with that path:

```
tf.saved_model.load(filepath)
```

No `safe_mode` check. It loads whatever path it is handed, every time.

That alone is not exploitable - you have to build the layer yourself to hit it. The interesting question is whether an attacker can get that constructor to run on a path *they* chose, inside a file *you* opened.

## Making it travel

They can, and the mechanism is the layer's own serialization. `get_config()` writes the `filepath` attribute out into the config, which means the path gets baked into any `.keras` archive that contains a `TFSMLayer`. Load the archive, and Keras faithfully reconstructs the layer from that config - by calling the constructor - with the attacker's path.

The only thing that could stop this is a `from_config()` override that consults `safe_mode` before rebuilding. There wasn't one. `TFSMLayer` inherited the default `Layer.from_config()`, which happily instantiates straight from attacker-controlled config and has never heard of `safe_mode`.

So the chain is: attacker points a `TFSMLayer` at their own SavedModel, saves a `.keras` file, and hands it to you. You load it the safe way. Keras rebuilds the layer, the constructor fires, and the attacker's SavedModel loads - `safe_mode=True` and all.

## The quiet part

Here is the detail that makes this more than a checkbox bypass. TensorFlow does not execute a SavedModel's functions when you *load* it. If it did, a careful reviewer watching the load might notice. Instead, loading only *registers* the attacker's graph. The graph runs the first time you actually use the model - a normal `model(x)` call, deep in your inference loop, hours and a hundred log lines away from the moment you opened the file.

The malicious behaviour hides one step downstream of the thing everyone inspects. That is what makes it nasty.

## Proving it

Three steps. First, the attacker builds a SavedModel whose graph has a side effect - here, writing a file, but a graph can read files and open sockets just as easily:

```
import tensorflow as tf

class Payload(tf.Module):
    @tf.function(
        input_signature=[tf.TensorSpec(shape=(None, 1), dtype=tf.float32)]
    )
    def serve(self, x):
        tf.io.write_file(
            "/tmp/tfsm_poc_triggered.txt",
            "TFSMLayer code execution via SavedModel\n"
        )
        return x

payload = Payload()
tf.saved_model.save(payload, "/tmp/evil_savedmodel")
```

Then they wrap it in a `TFSMLayer` and save an innocent-looking `.keras`:

```
import keras
from keras import layers, Model
from keras.layers import TFSMLayer

inp = layers.Input(shape=(1,), dtype="float32")
out = TFSMLayer(filepath="/tmp/evil_savedmodel", call_endpoint="serve")(inp)
Model(inp, out).save("malicious_tfsm.keras")
```

Now the victim does everything right - loads with `safe_mode=True`, and simply runs the model:

```
import keras, tensorflow as tf

model = keras.saving.load_model("malicious_tfsm.keras", safe_mode=True, compile=False)
model(tf.constant([[1.0]], dtype=tf.float32))   # the side effect fires here, not above
```

`/tmp/tfsm_poc_triggered.txt` appears. Tested on Keras 3.13.0 with TensorFlow 2.20.0.

## What it gets you

Attacker-controlled graph code, running under the privileges of whatever process does inference, with `safe_mode` switched on. A TensorFlow graph can write files (`tf.io.write_file`), read them (`tf.io.read_file`), reach the network, or just exhaust memory until the box falls over. The delivery is the boring part and the scary part: a model marketplace. A malicious `.keras` on a public hub, a trojanized popular checkpoint, or a file mailed to one specific target - anyone who loads it and runs inference is done.

## The one-line lesson, and the fix

The bug is not really in `TFSMLayer`. It is in the assumption that `safe_mode` covers "loading" when the dangerous thing happens at "using". The fix has to move the refusal to where the reconstruction happens - `from_config()`:

```
@classmethod
def from_config(cls, config, custom_objects=None, safe_mode=None):
    from keras.src.saving import serialization_lib
    if safe_mode is None:
        safe_mode = serialization_lib.in_safe_mode()
    if safe_mode:
        raise ValueError(
            "Loading a TFSMLayer from config is disallowed when "
            "`safe_mode=True` because it loads an external SavedModel "
            "that may contain attacker-controlled executable graph code."
        )
    return cls(**config)
```

Now the archive that used to load silently raises instead, and running the unsafe path takes an explicit opt-in - which is exactly what `safe_mode` was supposed to guarantee in the first place.

## Disclosure

Reported to the Keras team through huntr on January 6, 2026. Fixed upstream and published as CVE-2026-1462 (CWE-502), CVSS 8.8. The identifier was assigned to my report. Occurrences: `keras/src/export/tfsm_layer.py` L66 and L140.
