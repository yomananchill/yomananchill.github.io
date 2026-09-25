Everyone knows to put an auth check on an HTTP route. Then the same team wires up a WebSocket, and all that instinct quietly evaporates - because a socket doesn't look like a route, and the connection "already happened," so it feels trusted. It isn't.

LoLLMs drives its text generation over Socket.IO, and it made both halves of that mistake at once: it never checked who was on the other end of the socket, and it stored the state of every generation in variables shared across the whole server. An unauthenticated stranger could freeze the service for everyone, or reach into your running generation and pull the plug.

## A socket id is not a credential

When a client connects over Socket.IO it gets a session id, the `sid`. It is tempting to treat that as identity - it's unique, it's per-connection, it's right there in every handler. But it only answers "which connection is this," never "is this connection allowed to do the thing." Using it as an identity is like trusting a customer because they're standing in your shop. Presence is not permission.

LoLLMs used it as identity. Every sensitive handler in `add_events` (in `lollms_generation_events.py`) took the `sid`, looked up a client from it, and got to work - no token, no check:

```
@sio.on('generate_text')
async def handle_generate_text(sid, data):
    client_id = sid
    client = lollmsElfServer.session.get_client(client_id)  # who is sid? nobody asks
    lollmsElfServer.cancel_gen = False
    if lollmsElfServer.busy:            # global flag
        return
    lollmsElfServer.busy = True         # global flag
    # ... expensive generation starts here
```

And it wasn't one handler. The exact same "sid as identity, no check" pattern repeats across six of them: `generate_text`, `generate_msg`, `generate_msg_from`, `continue_generate_msg_from`, `cancel_generation`, and `cancel_text_generation`. Every one is effectively public.

## And the state belongs to everyone

Look again at those flags - `lollmsElfServer.busy`, `lollmsElfServer.cancel_gen`. They're not per-client. They're single variables on the server object, shared by every connection at once. Here's the cancel handler:

```
@sio.on('cancel_generation')
async def cancel_generation(sid):
    lollmsElfServer.cancel_gen = True   # global
    lollmsElfServer.busy = False        # global - whose task was even running?
```

So one client's "I'm done" is the whole server's "everyone's done." That's the second bug, and it bites even if you bolt authentication onto the first.

## Two ways to ruin someone's day

The first is denial of service, and it's trivial. Connect - no login - and send a `generate_text` with an absurd token budget:

```
{ "prompt": "...", "n_predicts": 999999 }
```

The handler flips the global `busy = True` and the server settles in for a very long job. Every real user's `generate_text` now hits `if busy:` and bounces. One anonymous socket, whole service down.

The second is meaner. A legitimate user is mid-generation, so `busy` is `True`. The attacker opens their own unauthenticated socket and sends `cancel_generation`. The handler never checks that the canceller is the person who started the job - it just sets `busy = False`. Now the server thinks it's idle while the victim's work is still churning in the background: races, resource contention, and eventually a crash when new tasks pile onto state that lies about itself.

## What it gets you

Availability and integrity, from someone who never logged in - freeze the service for everyone, or corrupt the server's sense of its own state until it falls over. And the missing session isolation is a confidentiality problem waiting to happen: if the message-fetch handlers behind `generate_msg_from` are as trusting as these, one user reaches another's conversations.

## The fix takes three moves, not one

Because there are two bugs stacked here, one patch doesn't do it:

First, authenticate the events. Require a real token on connect or per message, validate it, and only then map the `sid` to a verified identity.

Second, and this is the one people skip - move the state onto the client, so one connection can't touch another's:

```
client = lollmsElfServer.session.get_client(client_id)
if client.is_generating:      # per-client, not a global
    return
client.is_generating = True
# ... generate ...
client.is_generating = False
```

Third, cap the inputs and rate-limit the expensive events, so even a logged-in user can't ask for a billion tokens:

```
max_predicts = lollmsElfServer.config.get("max_n_predict", 1024)
n_predicts = min(data.get("n_predicts", max_predicts), max_predicts)
```

Upstream landed authentication, per-client state, and rate limiting together. All three were needed.

## Disclosure

Reported through huntr on June 22, 2025. Fixed upstream, published as CVE-2026-1117 (CWE-284), CVSS 8.2 - assigned to my report. Affected version 5.9.0.
