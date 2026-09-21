/* ---------------------------------------------------------------------------
   Disclosure record.

   depth: "full"  → full writeup. ONLY for findings verified fixed upstream,
                    with a patch, advisory or release note on record.
   depth: "index" → title / class / project / date / status only. No root cause,
                    no file names, no reachability. Use until a fix has shipped.

   credited: true  → the identifier was assigned to this report.
   credited: false → found independently but filed after someone else; the
                     identifier belongs to the first reporter. Never present
                     an uncredited CVE as one that was awarded here.

   Fix status last verified 2026-09-20 against upstream patches and advisories.
--------------------------------------------------------------------------- */

const REPORTS = [
  /* ───────────────────────── verified fixed ───────────────────────── */
  {
    slug: "keras-tfsmlayer-safe-mode-bypass",
    depth: "full", credited: true,
    title: "TFSMLayer Bypasses safe_mode, Executing Attacker Graphs At Inference",
    short: "safe_mode Was Not Safe",
    deck: "A flag that promised to refuse dangerous models loaded one anyway, and ran its logic at inference time.",
    repo: "keras-team/keras", cls: "Deserialization", sev: "high", cvss: "8.8",
    date: "2026-01-06", state: "Fixed", cve: "CVE-2026-1462",
    url: "https://www.cve.org/CVERecord?id=CVE-2026-1462",
    tags: ["AI/ML", "Model Loading"],
    summary:
      "TFSMLayer in keras/src/export/tfsm_layer.py calls tf.saved_model.load(filepath) from its constructor without honouring safe_mode, and serialises the attacker-controllable filepath through get_config(). With no from_config() override to reject it, a .keras archive can point at an attacker-supplied SavedModel and have it loaded even when safe_mode=True.",
    root:
      "safe_mode exists to refuse any deserialization path that can run attacker code. TFSMLayer sat outside that contract: the constructor loaded whatever path it was handed, and because get_config() round-trips that path, the value survives into a saved archive. Deserialising the archive reconstructs the layer, the constructor runs, and the external SavedModel is loaded. The attacker's TensorFlow graph then executes as part of ordinary model inference - not at load time where a reviewer might be watching, but later, when the model is used.",
    impact:
      "A malicious .keras model pulled from a hub or introduced through a supply-chain compromise runs attacker-controlled graph operations - file read and write, resource exhaustion - with the privileges of whatever process performs inference, despite safe_mode being on.",
    fix: "A from_config() override now raises when safe_mode is enabled, forcing an explicit opt-in for unsafe deserialization.",
  },
  {
    slug: "keras-hdf5-externallink-intermediate",
    depth: "full", credited: false,
    title: "HDF5 ExternalLink Followed Through An Intermediate Path Component",
    short: "An Incomplete Fix In Keras HDF5 Loading",
    deck: "The guard checked the last component of the path. The attacker used the second-to-last.",
    repo: "keras-team/keras", cls: "Path Traversal", sev: "medium", cvss: "6.5",
    date: "2026-06-13", state: "Fixed", cve: "",
    ident: "keras PR #23168", fixedIn: "keras 3.15.1",
    url: "https://github.com/keras-team/keras/pull/23168",
    tags: ["AI/ML", "Model Loading", "Incomplete Fix"],
    summary:
      "CVE-2026-9337 and CVE-2026-9630 were closed by centralising HDF5 access in two hardened accessors, safe_get_h5_group() and safe_get_h5_dataset(), which reject h5py ExternalLink and SoftLink. Both determined the link type with h5py's get(name, getclass=True, getlink=True) - which reports the class of the final path component only. Loaders pass multi-component, attacker-controlled names straight in.",
    root:
      "A name like \"ext/kernel\" asks h5py to resolve ext first and then report on kernel. If ext is an ExternalLink, h5py follows it into another file on the victim's disk, and the guard - looking only at kernel, an ordinary HardLink - waves it through. The follow-up checks on dataset.external and dataset.is_virtual do not help either, because by the time they run the object has already resolved: it is a perfectly ordinary dataset that simply lives somewhere else. The legacy .h5 loader passes weight_names and layer_names read verbatim from file attributes, and the v3 .keras loader passes multi-component layer paths, so the attacker controls the string either way.",
    impact:
      "A victim loading an attacker-supplied .h5 or .keras file has arbitrary HDF5 files from their host read into the model's weights and returned to the attacker. Works at default settings with safe_mode=True.",
    fix: "The accessors now split the name and run the link-class check on every component rather than letting h5py resolve nested paths. Landed in 3.15.1.",
  },
  {
    slug: "mlflow-serve-stdin-command-injection",
    depth: "full", credited: false,
    title: "Command Injection Through An Unquoted Model Path In serve_stdin",
    short: "Command Injection In MLflow Model Serving",
    deck: "A directory name is not a string when it reaches bash -c. It is a program.",
    repo: "mlflow/mlflow", cls: "Command Injection", sev: "critical", cvss: "9.6",
    date: "2026-04-11", state: "Fixed", cve: "",
    ident: "GHSA-cw8f-5wj5-grm3", fixedIn: "MLflow 3.13.0",
    url: "https://github.com/mlflow/mlflow/pull/23180",
    tags: ["AI/ML", "MLOps"],
    summary:
      "PyFuncBackend.serve_stdin interpolated the model's local_path into a command string unquoted, and that string was executed through bash -c. Shell metacharacters in the model directory name are evaluated during shell parsing, before the command they were supposed to be an argument to ever runs.",
    root:
      "An earlier hardening pass (PR #19738) quoted model_uri on the MLServer path and stopped there. The stdin serving variant built its command the same way and kept the raw value, so the fix covered one of two sibling call sites. This is the ordinary shape of a command-injection bug: not an absent concept of quoting, but a quoting rule applied at one call site and not the next one over.",
    impact:
      "Anyone able to influence the model directory path executes arbitrary commands as the MLflow serving process. In a registry-backed deployment that path is frequently attacker-influenced.",
    fix: "local_path is now passed through shlex.quote() when the command string is built, with the server script quoted defensively as well.",
  },
  {
    slug: "mlflow-idor-datasets-webhooks-traces",
    depth: "full", credited: false,
    title: "Authorization Bypass Across Datasets, Webhooks And Traces APIs",
    short: "IDOR Across MLflow APIs",
    deck: "The permission check ran only for endpoints someone had remembered to list.",
    repo: "mlflow/mlflow", cls: "Broken Access Control", sev: "critical", cvss: "9.9",
    date: "2026-02-20", state: "Fixed", cve: "",
    ident: "MLflow PR #25066", fixedIn: "MLflow 3.11.0 - 3.16.0",
    url: "https://github.com/mlflow/mlflow/pull/25066",
    tags: ["AI/ML", "MLOps"],
    summary:
      "A long list of newer endpoints - dataset create/get/delete, webhook create/delete, StartTraceV3, GetTraceInfoV3, BatchGetTraces, assessment create/delete - were missing from BEFORE_REQUEST_HANDLERS in the auth plugin. get_before_request_handler returned None for them, and the calling code guarded on `if validator:`, so no check ran at all.",
    root:
      "The authorization layer was a lookup table keyed by endpoint, and an endpoint absent from the table failed open rather than closed. Every feature added after the table was written arrived unprotected by default, and nothing in the build complained. The bug is not in any one handler; it is in choosing allow as the behaviour for the unknown case.",
    impact:
      "Any authenticated low-privilege user could read, poison or delete other teams' datasets, traces and assessments across experiments, and create webhooks - which yields authenticated SSRF as a bonus - with RBAC fully bypassed.",
    fix: "Closed in stages: webhook CRUD gated admin-only in 3.11.0, trace and assessment endpoints registered in 3.13.0, dataset routes gated on experiment permission in 3.16.0 with a fail-closed prefix branch and a CI coverage guard so the table cannot silently fall behind again.",
  },
  {
    slug: "mlflow-trace-assessment-authz",
    depth: "full", credited: false,
    title: "Trace Assessment APIs Allowed Unauthorized Read, Write And Delete",
    short: "Unguarded Trace Assessment APIs",
    deck: "New endpoints, old permission table, nobody joined them up.",
    repo: "mlflow/mlflow", cls: "Broken Access Control", sev: "high", cvss: "8.8",
    date: "2026-02-24", state: "Fixed", cve: "CVE-2026-8147",
    ident: "CVE-2026-8147", fixedIn: "MLflow 3.13.0",
    url: "https://github.com/advisories/GHSA-2cm6-r77w-6g96",
    tags: ["AI/ML", "MLOps"],
    summary:
      "The v3.0 Trace Assessment endpoints - create, get, update and delete assessment - were never added to BEFORE_REQUEST_VALIDATORS, and the handlers themselves performed no ownership check. Because unmapped routes defaulted to allow-if-authenticated, any user could perform full CRUD on assessments attached to other users' traces in private experiments.",
    root:
      "Assessments hang off a trace, which hangs off an experiment, and the experiment is where permissions actually live. Nothing in the assessment handlers walked back up that chain, so there was no point at which the request's identity was compared against the owner of the data being touched.",
    impact:
      "Any low-privileged user could read, forge, tamper with or delete another user's evaluation and feedback data across the whole platform - the data teams use to decide whether a model is behaving.",
    fix: "The four endpoints were registered against validate_can_read_trace_by_trace_id and validate_can_update_trace_by_trace_id, so assessment access now inherits the parent experiment's permissions.",
  },
  {
    slug: "mlflow-prompt-tag-arbitrary-read",
    depth: "full", credited: false,
    title: "Arbitrary File Read Via A Prompt Tag Validation Bypass In The Model Registry",
    short: "A Tag That Skipped Validation",
    deck: "Set the right tag and the source check does not run at all.",
    repo: "mlflow/mlflow", cls: "Path Traversal", sev: "critical", cvss: "9.3",
    date: "2026-02-14", state: "Fixed", cve: "",
    ident: "CVE-2026-2614", fixedIn: "MLflow 3.10.0",
    url: "https://github.com/advisories/GHSA-42h5-h8qh-vv9v",
    tags: ["AI/ML", "MLOps"],
    summary:
      "In _create_model_version, supplying the tag mlflow.prompt.is_prompt made _is_prompt_request() return true, which skipped _validate_source_run and _validate_source_model entirely. With validation out of the way, source could be set to any local path and the contents retrieved through the model-versions get-artifact endpoint.",
    root:
      "Prompts were treated as a special case that did not need the same source validation as models, and the marker for that special case was a tag - a value supplied by the caller. The branch that decides whether to validate was therefore controlled by the party being validated.",
    impact:
      "Read any file the server can read: /etc/passwd, /proc/self/environ, cloud credentials, SSH keys. Unauthenticated where auth is not enabled, which is the default posture for a great many tracking servers.",
    fix: "The branch was inverted so prompt requests are validated rather than exempted, rejecting file:// sources and schemeless absolute paths and applying traversal checks to the rest.",
  },
  {
    slug: "mlflow-default-cors",
    depth: "full", credited: false,
    title: "Default Server CORS Misconfiguration Allowed Cross-Origin Read-Write API Access",
    short: "Permissive CORS By Default",
    deck: "The restrictive branch set the same wildcard the permissive one did.",
    repo: "mlflow/mlflow", cls: "CORS Misconfiguration", sev: "critical", cvss: "9.6",
    date: "2026-02-14", state: "Fixed", cve: "",
    ident: "CVE-2026-2611", fixedIn: "MLflow 3.10.0",
    url: "https://github.com/mlflow/mlflow/commit/8f9c8a53af90842944101eb8b7d60706822c81bc",
    tags: ["AI/ML", "MLOps"],
    summary:
      "init_fastapi_security installed Starlette's CORSMiddleware with allow_origins=[\"*\"] and allow_credentials=True even in the non-wildcard branch - the one that runs by default. Every API response therefore carried a permissive Access-Control-Allow-Origin for any site.",
    root:
      "There were two branches for two postures and both ended up setting the same wildcard, so the configuration knob did nothing. A compensating CORSBlockingMiddleware existed but only covered /api/ paths, and it could not help regardless: the outer middleware had already written the permissive header onto the response.",
    impact:
      "Any page a logged-in user visits could issue authenticated cross-origin reads and writes against their MLflow server - enumerate experiments, runs and models, delete experiments, register malicious model versions.",
    fix: "The non-wildcard branch now passes the configured origins through, with an explicit localhost pattern, and the API-endpoint test was widened to cover the /ajax-api/ prefix.",
  },
  {
    slug: "mlflow-webhook-ssrf",
    depth: "full", credited: true,
    title: "SSRF Through User-Controlled Webhook URLs In MLflow",
    short: "MLflow Dialled Any Number It Was Handed",
    deck: "A webhook field with no validation turns the server into an HTTP client for whoever asks.",
    repo: "mlflow/mlflow", cls: "SSRF", sev: "high", cvss: "7.1",
    date: "2026-02-10", state: "Fixed", cve: "CVE-2026-2393",
    url: "https://www.cve.org/CVERecord?id=CVE-2026-2393",
    tags: ["AI/ML", "MLOps"],
    summary:
      "_create_webhook() stored a user-supplied webhook URL with no scheme filtering and no allowlist, and _send_webhook_request() issued HTTP POSTs straight to that URL whenever the webhook was tested or triggered.",
    root:
      "Webhooks are a deliberate outbound-request feature, which is exactly why the destination needs constraining. Nothing on the create path rejected a scheme, a loopback address, a private range or a link-local address, and nothing on the delivery path re-checked before sending. The attacker never needs to reach the internal service - they only need the server to reach it, and the server is already inside the perimeter.",
    impact:
      "An authenticated attacker makes the MLflow backend issue requests to internal services and cloud metadata endpoints, turning a tracking server into a pivot for credential theft and internal reconnaissance.",
    fix: "Webhook destinations are validated and allowlisted, with private, loopback and metadata ranges rejected.",
  },
  {
    slug: "nltk-data-load-ssrf",
    depth: "full", credited: false,
    title: "SSRF In nltk.data.load() Through An Unrestricted urlopen",
    short: "SSRF In NLTK Resource Loading",
    deck: "Anything that was not nltk: or file: became a network request to wherever you pointed it.",
    repo: "nltk/nltk", cls: "SSRF", sev: "critical", cvss: "9.3",
    date: "2026-02-22", state: "Fixed", cve: "",
    ident: "nltk commit 4386e34", fixedIn: "NLTK 3.9.4",
    url: "https://github.com/nltk/nltk/commit/4386e344d94c5bd0071ee52732638f6929d59d8a",
    tags: ["NLP", "Resource Loading"],
    summary:
      "nltk.data._open fell through to urllib.request.urlopen(resource_url) for any scheme other than nltk: or file:, with no allowlist, no address filtering and no redirect handling. Wherever user input reached nltk.data.load(), the server issued attacker-chosen requests.",
    root:
      "The function's job is to fetch a resource, and it accepted any locator that looked like one. A scheme check that enumerates two known-good cases and then defaults to a general-purpose network fetch for everything else is an allowlist with a hole where the default branch should be.",
    impact:
      "Internal service and network reconnaissance from inside the perimeter, and access to cloud metadata endpoints at 169.254.169.254 for credential theft.",
    fix: "A pathsec module now wraps urlopen with scheme allowlisting and private-range filtering, and data.py routes through it. Note that the filter itself has since needed further hardening, which is normal for SSRF defences.",
  },
  {
    slug: "feast-feature-server-traversal",
    depth: "full", credited: false,
    title: "Unauthenticated Arbitrary File Read In The Feast Feature Server",
    short: "Unauthenticated File Read In Feast",
    deck: "An endpoint that took a file path and opened it. That was the whole bug.",
    repo: "feast-dev/feast", cls: "Path Traversal", sev: "high", cvss: "7.5",
    date: "2026-01-06", state: "Fixed", cve: "",
    ident: "CVE-2026-23536", fixedIn: "Feast 0.60.0",
    url: "https://github.com/advisories/GHSA-9p47-cwvm-h4hj",
    tags: ["AI/ML", "Feature Store"],
    summary:
      "The Feature Server exposed an unauthenticated POST /read-document endpoint that passed the caller's file_path straight to open(), with no allowlist, no base directory and no canonicalization, and accepted absolute paths.",
    root:
      "There was no boundary to escape. Traversal sequences were not even necessary - an absolute path was accepted as-is. The endpoint appears to have been built for local development convenience and shipped on a server that listens on the network.",
    impact:
      "Unauthenticated remote read of any file the process can open: feature_store.yaml and the credentials in it, Kubernetes service-account tokens, whatever else is on the box. Enough to reach the databases and cloud accounts behind it.",
    fix: "The /read-document and /save-document handlers were removed outright in 0.60.0, along with their UI-server counterparts.",
  },
  {
    slug: "lollms-socketio-access-control",
    depth: "full", credited: true,
    title: "Unauthenticated Socket.IO Handlers Allow Sensitive Actions In LoLLMs",
    short: "Anyone Who Knocked Could Press The Buttons",
    deck: "Event handlers that trusted a socket ID, and global flags shared by everyone.",
    repo: "parisneo/lollms", cls: "Broken Access Control", sev: "high", cvss: "8.2",
    date: "2025-06-22", state: "Fixed", cve: "CVE-2026-1117",
    url: "https://www.cve.org/CVERecord?id=CVE-2026-1117",
    tags: ["AI/ML", "Realtime"],
    summary:
      "add_events registered Socket.IO handlers for generation and cancellation that used the socket's sid directly as the client identity, with no authentication or authorization, and tracked generation state in global flags shared across every connected client.",
    root:
      "Two failures compounding. A socket ID is an identifier, not a credential - it says which connection you are, never that you are allowed to do anything - so every handler was effectively public. And the state those handlers mutate is global, so one client's cancellation is everyone's cancellation. Even with authentication bolted on, the shared-state bug alone lets one connection interfere with another's work.",
    impact:
      "An unauthenticated client can monopolise generation resources to deny service to every user, or cancel and corrupt other users' in-progress work through the shared global flags.",
    fix: "Socket.IO events are authenticated and authorized, global generation state was replaced with per-client state, and rate limiting was added.",
  },
  {
    slug: "llama-index-obsidian-hardlink-traversal",
    depth: "full", credited: true,
    title: "Hardlink-Based Path Traversal In ObsidianReader",
    short: "Hardlinks Walked Straight Out Of The Vault",
    deck: "A boundary check that understood symlinks, and nothing else.",
    repo: "run-llama/llama_index", cls: "Path Traversal", sev: "medium", cvss: "6.2",
    date: "2025-04-02", state: "Fixed", cve: "CVE-2025-6210",
    url: "https://www.cve.org/CVERecord?id=CVE-2025-6210",
    tags: ["AI/ML", "Data Ingestion"],
    summary:
      "ObsidianReader.load_data() enforced its vault boundary with Path.resolve() and a startswith() check. Hardlinks survive resolve() - they are not links to a path, they are second names for the same inode - so a hardlink created inside the vault and pointing at a system file was read and returned as a document.",
    root:
      "The check asked the right question in the wrong vocabulary. resolve() collapses symlinks and relative segments, so afterwards the path genuinely does sit under the vault and startswith() agrees. A hardlink has no indirection left to collapse: the file simply has two names and one of them is inside. Passing followlinks=False to os.walk does not help either, because that flag governs symlinks. The boundary was path-shaped; the attack was inode-shaped.",
    impact:
      "Arbitrary read of files outside the vault, returned as ordinary indexed documents, with no elevated privileges and no interaction beyond indexing a vault an attacker could write into.",
    fix: "Hardlinks are detected by inode and link count and skipped during the walk. Landed in 0.5.2.",
  },
  {
    slug: "llama-index-encode-image-traversal",
    depth: "full", credited: true,
    title: "Arbitrary File Read Through Path Traversal In encode_image",
    short: "A Reader That Read Rather Too Much",
    deck: "An image path taken on trust, opened, and handed back base64-encoded.",
    repo: "run-llama/llama_index", cls: "Path Traversal", sev: "high", cvss: "7.5",
    date: "2025-04-01", state: "Fixed", cve: "CVE-2025-6209",
    url: "https://www.cve.org/CVERecord?id=CVE-2025-6209",
    tags: ["AI/ML", "Multimodal"],
    summary:
      "encode_image in generic_utils.py opened an attacker-controllable image_path - reachable through ImageDocument - with no sanitization or canonicalization. Traversal sequences and absolute paths caused it to read and base64-encode arbitrary files on the host.",
    root:
      "The function's contract was \"give me an image, I will encode it\", and it honoured that literally. Because the encoded result is returned to the caller, the read is not blind: whatever the path resolves to comes back in full, through a normal multimodal document flow. No filesystem boundary was ever established, so there was nothing for traversal to escape.",
    impact:
      "Disclosure of sensitive host files through a routine ingestion path, useful directly and as a step toward privilege escalation.",
    fix: "image_path is canonicalized and validated against an allowed directory, rejecting absolute paths and traversal.",
  },

  /* ──────────────── reported, still unpatched upstream ──────────────── */
  {
    slug: "transformers-nougat-redos",
    depth: "index", credited: false,
    title: "Regular Expression Denial Of Service In Nougat Tokenization",
    short: "ReDoS In Transformers",
    repo: "huggingface/transformers", cls: "ReDoS", sev: "medium", cvss: "5.3",
    date: "2026-02-23", state: "Unpatched", cve: "",
    url: "https://github.com/huggingface/transformers",
    tags: ["AI/ML", "Tokenization"],
  },
  {
    slug: "llama-index-unstructured-dos",
    depth: "index", credited: false,
    title: "Denial Of Service Via The UnstructuredReader Split Document Path",
    short: "Unbounded Ingestion In UnstructuredReader",
    repo: "run-llama/llama_index", cls: "Denial of Service", sev: "medium", cvss: "5.3",
    date: "2025-06-20", state: "Unpatched", cve: "",
    url: "https://github.com/run-llama/llama_index",
    tags: ["AI/ML", "Data Ingestion"],
  },
  {
    slug: "llama-index-txtai-pickle",
    depth: "index", credited: false,
    title: "Unsafe Pickle Deserialization In TxtaiVectorStore",
    short: "Pickle Fallback In A Vector Store",
    repo: "run-llama/llama_index", cls: "Deserialization", sev: "high", cvss: "8.3",
    date: "2025-04-08", state: "Unpatched", cve: "",
    url: "https://github.com/run-llama/llama_index",
    tags: ["AI/ML", "Vector Stores"],
  },
];
