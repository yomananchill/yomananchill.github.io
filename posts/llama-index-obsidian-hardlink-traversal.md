This is the most stupid bug I have ever found. I mean that with affection. It is not clever, it is not deep, the fix is a couple of lines - and it still strolled straight out of the sandbox it was built to stay inside, using a filesystem feature most people forget exists.

It's also one of my first. April 2025, right at the start of my journey into this, when I was reading small, boring file readers line by line just to learn the ways people get boundaries wrong. LlamaIndex's `ObsidianReader` is supposed to only read files inside your Obsidian vault. I got it to read `/etc/passwd` with a two-word command.

## The check that looks bulletproof

`ObsidianReader.load_data()` in `llama_index/readers/obsidian/base.py` fences itself into the vault with two steps that, honestly, look correct:

```
file_path_obj = file_path_obj.resolve()          # normalise to an absolute path
if not str(file_path_obj).startswith(str(input_dir_abs)):
    continue                                     # refuse anything outside the vault
```

`resolve()` collapses `..` segments and follows symlinks, so after it runs the path genuinely is absolute and normalized, and `startswith` genuinely confirms it sits under the vault. If your attack is `../../../../etc/passwd`, this beats you. If your attack is a symlink pointing out of the vault, `resolve()` follows it to the real location and `startswith` catches it there. Against the two attacks everyone thinks of, the check wins. That's why it shipped.

## The thing resolve() cannot see

A hardlink is not a link to a path. It's a second *name* for the same inode - the same bytes on disk, reachable under two filenames at once. There is no pointer, no indirection, nothing for `resolve()` to collapse, because nothing is being redirected. The file simply is inside the vault, and it also simply is `/etc/passwd`. `resolve()` returns a path under the vault (true), `startswith` agrees (true), and the reader reads it (oh no).

The check asked "is this path inside the directory." The right question was "is this file the same bytes as something outside the directory." Those are different questions, and a hardlink lives exactly in the gap between them.

## It even thought about links

Here's the part that makes me laugh. The reader passes `followlinks=False` to `os.walk()`. It *was* thinking about links - it deliberately told the walker not to follow them. But `followlinks` governs *symlinks*. Hardlinks aren't a kind of link the flag has ever heard of; they sail straight past it. The defense and the attack were talking about two different things that happen to share a word.

## Two lines to walk out of the vault

Step one, drop a hardlink to a system file into any vault the reader will index:

```
ln /etc/passwd /path/to/Vault/hardlinkexploit.md
```

Step two, run the reader the way any application using it would - nothing exotic, just `load_data()`:

```
from llama_index.readers.obsidian import ObsidianReader

reader = ObsidianReader(input_dir="/path/to/Vault")
docs = reader.load_data()
doc = next(d for d in docs if d.metadata.get("file_name") == "hardlinkexploit.md")
print(doc.text)
```

And `/etc/passwd` prints, indexed as an ordinary note:

```
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
...
```

No traversal string. No symlink. No privileges. Just a file wearing two names.

## What it gets you, and why I keep it around

Any file the process can read, returned as a normal document, wherever an attacker can get a file into a vault that later gets indexed - a shared vault, a synced folder, an upload dir. It's a local vector and modest severity, which is why it's a 6.2 and not a 9. But it's a clean, total bypass of the single thing the reader existed to enforce, and I keep it in my back pocket as a reminder: a security check can ask exactly the right question in the wrong vocabulary, and be confidently, cheerfully wrong. I've found flashier bugs since. I'm not sure I've found a tidier lesson.

## The fix

Stop reasoning about paths and start reasoning about inodes - detect the hardlink and skip it:

```
import os

def is_hardlink(filepath, input_dir):
    return os.stat(filepath).st_ino != os.stat(input_dir).st_ino
```

...with a `continue` past anything that trips it. Upstream landed inode and link-count detection in 0.5.2.

## Disclosure

Reported through huntr on April 2, 2025. Fixed in llama_index 0.5.2, published as CVE-2025-6210 (CWE-22), CVSS 6.2 - assigned to my report.
