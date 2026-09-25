/* ---------------------------------------------------------------------------
   Blog index.

   To publish a post:
     1. add a file at  posts/<slug>.md
     2. add an entry below, newest first

   That is the whole process. No build step, no install, nothing to run - edit
   both files straight in the GitHub web editor and commit. The deploy picks it
   up automatically.

   `slug` must match the filename exactly, minus the .md

   Writeups are only for findings credited to me and fixed upstream - my own
   reports, my own PoCs. Most carry a CVE; where a project's policy declines one
   (e.g. app-level DoS), the fix and the credit are still on record.
--------------------------------------------------------------------------- */

const POSTS = [
  {
    slug: "libreoffice-emf-drawbeziers-dos",
    title: "The loop that counted to infinity by threes",
    date: "2026-09-20",
    tags: ["Document Parsing", "Denial of Service"],
    summary: "A LibreOffice EMF+ record claimed four billion bezier points in 180 bytes. A counter stepping by three could never hit the count, wrapped past 2^32, and looped forever - allocating until the process died. Fixed and credited upstream.",
  },
  {
    slug: "mlflow-webhook-ssrf",
    title: "MLflow dialled any number it was handed",
    date: "2026-02-10",
    tags: ["MLOps", "SSRF"],
    summary: "MLflow's new webhooks stored a user-supplied URL with no validation and POSTed to it, so an authenticated user could aim the server at cloud metadata or internal services. CVE-2026-2393.",
  },
  {
    slug: "keras-tfsmlayer-safe-mode-bypass",
    title: "When safe_mode wasn't safe",
    date: "2026-01-06",
    tags: ["AI/ML", "Deserialization"],
    summary: "A Keras layer loaded an attacker's SavedModel from a .keras archive despite safe_mode=True, and ran its graph during inference - one step downstream of where anyone looks. CVE-2026-1462.",
  },
  {
    slug: "lollms-socketio-access-control",
    title: "A socket ID is not a credential",
    date: "2025-06-22",
    tags: ["AI/ML", "Broken Access Control"],
    summary: "LoLLMs trusted the socket id as identity across six generation handlers and kept generation state in globals, so any unauthenticated client could deny service or corrupt another user's run. CVE-2026-1117.",
  },
  {
    slug: "llama-index-obsidian-hardlink-traversal",
    title: "The stupidest bug I've found",
    date: "2025-04-02",
    tags: ["AI/ML", "Path Traversal"],
    summary: "Early days. LlamaIndex's ObsidianReader guarded its vault with resolve() and startswith() - and a plain hardlink, which has no path to resolve, read /etc/passwd anyway. CVE-2025-6210.",
  },
  {
    slug: "llama-index-encode-image-traversal",
    title: "A reader that read rather too much",
    date: "2025-04-01",
    tags: ["AI/ML", "Path Traversal"],
    summary: "A LlamaIndex helper opened an attacker-controlled image path and returned the bytes base64-encoded - arbitrary host file read through a normal multimodal flow. CVE-2025-6209.",
  },
];
