/* ---------------------------------------------------------------------------
   Audit corpus - codebases read during ongoing research.

   DELIBERATELY CONTAINS NO FINDINGS. Several of these carry live, unresolved
   reports. Nothing here names a bug, a file, a function, a subsystem slice or
   a technique. Project, language, and what the codebase *is* - nothing more.
   Do not add findings to this file.
--------------------------------------------------------------------------- */

const AUDITS = {
  note:
    "Codebases under active review. Findings are withheld while disclosure is in progress - " +
    "what follows is only where the reading happened.",

  /* Counts only. No project attribution, no classes, no detail. */
  pending: 16,
  pendingProjects: 6,
  slices: 176,

  /* langs[0] is the primary language; the rest are what the tree actually
     contains, counted from the working copies rather than assumed. */
  projects: [
    { name: "Chromium",    langs: ["C++", "C", "Java", "Python"],        area: "Browser engine",      note: "Rendering, graphics and document pipelines" },
    { name: "Wireshark",   langs: ["C", "C++", "Python", "Lua"],         area: "Protocol analysis",   note: "Packet dissectors across many wire formats" },
    { name: "llama.cpp",   langs: ["C++", "TypeScript", "Python", "C"],  area: "Inference runtime",   note: "Local LLM serving and model loading" },
    { name: "Redis",       langs: ["C", "Python"],                        area: "In-memory datastore", note: "Core server and loadable modules" },
    { name: "LibreOffice", langs: ["C++", "Python"],                      area: "Document suite",      note: "Office document format handling" },
    { name: "ClamAV",      langs: ["C", "C++", "Python"],                 area: "Anti-malware",        note: "File format parsing and unpacking" },
    { name: "OpenThread",  langs: ["C++", "Python", "C"],                 area: "Mesh networking",     note: "Thread / IPv6 low-power stack" },
    { name: "PowerShell",  langs: ["C#", "PowerShell"],                   area: "Shell & runtime",     note: ".NET-hosted command language" },
    { name: "Protobuf",    langs: ["C++", "C", "Python"],                 area: "Serialization",       note: "Wire format encoding and decoding" },
    { name: "RE2",         langs: ["C++", "Python"],                      area: "Regex engine",        note: "Linear-time regular expression matching" },
    { name: "Brotli",      langs: ["C", "Java", "C#", "Python"],          area: "Compression",         note: "Codec used across the web platform" },
    { name: "oFono",       langs: ["C"],                                  area: "Telephony",           note: "Modem and cellular stack" },
    { name: "PDFCreator",  langs: ["C#", "JavaScript"],                   area: "PDF tooling",         note: "Document generation and conversion" },
    { name: "Vercel AI",   langs: ["TypeScript", "JavaScript"],           area: "AI SDK",              note: "Model routing and streaming surface" },
    { name: "Elysia",      langs: ["TypeScript"],                         area: "Web framework",       note: "HTTP routing and request handling" },
    { name: "Apple",       langs: ["Objective-C", "Python"],              area: "Platform internals",  note: "macOS system frameworks" },
  ],
};
