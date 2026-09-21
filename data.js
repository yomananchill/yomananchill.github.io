/* All site content lives here. Edit this file, nothing else, to update the site. */

const DATA = {
  identity: {
    name: "Manan Patel",
    short: "Manan P.",
    alias: "0xManan",
    handle: "yomananchill",
    role: "Security Researcher",
    location: "Bengaluru, India",
    status: "Active",
    fileNo: "0M4N",
    email: "notmanan.ctf@gmail.com",
    github: "yomananchill",
    twitter: "0xManan",
    linkedin: "manan-patel-4330101b4",
    summary:
      "I work the layer under the application: browser engines, packet dissectors, compression codecs, shells — and whatever else the AI boom turned out to be built on. It arrives with everything else and gets read by nobody. What's fixed is published. What isn't, isn't.",
    signature: "M. Patel",
    tagline: "I'm weird, I hack.",
    payline: "Fintech security and compliance in Bengaluru pays for it.",
    display: "!Manan",
  },

  stats: [
    { n: "05", label: "CVEs disclosed" },
    { n: "06", label: "certifications" },
    { n: "05", label: "CTF podiums" },
    { n: "04", label: "years offensive" },
  ],

  /* Issuers verified 2026-09-21. PT1 is TryHackMe's Junior Penetration Tester —
     not "Level 1", which is what I had. Check the rest against your certificates. */
  clearances: [
    { id: "CRTO", full: "Certified Red Team Operator", by: "Zero-Point Security", group: "Offensive" },
    { id: "CRTA", full: "Certified Red Team Analyst", by: "CyberWarFare Labs", group: "Offensive" },
    { id: "PT1",  full: "Junior Penetration Tester", by: "TryHackMe", group: "Offensive" },
    { id: "eJPT", full: "Junior Penetration Tester", by: "INE Security", group: "Offensive" },
    { id: "CNSP", full: "Certified Network Security Practitioner", by: "The SecOps Group", group: "Defensive" },
    { id: "CAP",  full: "Certified AppSec Practitioner", by: "The SecOps Group", group: "Defensive" },
  ],

  domains: [
    "Offensive Security",
    "Red Teaming",
    "AI / ML Security",
    "Cloud Security (AWS)",
    "Threat Modeling",
    "Incident Response",
    "Detection Engineering",
    "Secure Code Review",
    "Vulnerability Research",
    "Governance & Compliance",
  ],

  education: [
    {
      school: "Parul University",
      cred: "B.Tech, Computer Science — Cybersecurity",
      meta: "8.06 / 10 CGPA",
      when: "2020 — 2024",
    },
  ],

  cves: [
    {
      id: "CVE-2026-2393",
      head: "MLflow Dialled Any Number It Was Handed",
      project: "mlflow/mlflow",
      cls: "SSRF",
      sev: "high",
      when: "2026",
      via: "Protect AI",
      url: "https://www.cve.org/CVERecord?id=CVE-2026-2393",
      body:
        "Server-Side Request Forgery in webhook handling. User-controlled webhook URLs were accepted without validation, allowing outbound requests to arbitrary internal or external endpoints, including cloud metadata services.",
    },
    {
      id: "CVE-2026-1462",
      head: "Safe Mode Was Not Safe",
      deck: "A flag that promised to refuse dangerous models loaded one anyway, and ran its logic at inference time.",
      project: "keras-team/keras",
      cls: "Deserialization",
      sev: "critical",
      when: "2026",
      via: "Protect AI",
      url: "https://www.cve.org/CVERecord?id=CVE-2026-1462",
      body:
        "The safe_mode flag was bypassable via TFSMLayer. Attacker-controlled TensorFlow SavedModels could still be loaded during deserialization, executing attacker-controlled graph logic at model-inference time and defeating the protection the flag is supposed to provide.",
    },
    {
      id: "CVE-2026-1117",
      head: "Anyone Who Knocked Could Press The Buttons",
      project: "parisneo/lollms",
      cls: "Broken Access Control",
      sev: "medium",
      when: "2026",
      via: "Protect AI",
      url: "https://www.cve.org/CVERecord?id=CVE-2026-1117",
      body:
        "Improper access control in Socket.IO event handlers. Unauthenticated clients could invoke sensitive generation and cancellation actions, enabling denial of service, state corruption, and cross-session interference.",
    },
    {
      id: "CVE-2025-6210",
      head: "Hardlinks Walked Straight Out Of The Sandbox",
      project: "run-llama/llama_index",
      cls: "Isolation Bypass",
      sev: "high",
      when: "2025",
      via: "Protect AI",
      url: "https://www.cve.org/CVERecord?id=CVE-2025-6210",
      body:
        "Filesystem isolation bypass in ObsidianReader through unsafe handling of hardlinks. Hardlinked files placed inside an allowed directory bypassed path-based restrictions and reached sensitive files elsewhere on disk.",
    },
    {
      id: "CVE-2025-6209",
      head: "A Reader That Read Rather Too Much",
      project: "run-llama/llama_index",
      cls: "Path Traversal",
      sev: "high",
      when: "2025",
      via: "Protect AI",
      url: "https://www.cve.org/CVERecord?id=CVE-2025-6209",
      body:
        "Path traversal in encode_image. User-controlled file paths were used without sanitization or canonicalization, so crafted traversal sequences escaped the intended directory and read arbitrary files on the host.",
    },
  ],

  work: [
    {
      org: "Khatabook",
      place: "Bengaluru, India",
      span: "Aug 2025 — Present",
      roles: [
        {
          title: "Security Researcher & Compliance",
          span: "Aug 2025 — Present",
          points: [
            "Lead information security and compliance programs across multiple legal entities, covering international security standards and financial-sector regulation.",
            "Own end-to-end security operations — vulnerability management, incident response, detection engineering, and cloud security across AWS.",
            "Run offensive research and red team simulation to surface risk before anyone else finds it.",
            "Drive audit readiness end to end: evidence coordination, auditor engagement, and continuous improvement of control effectiveness.",
          ],
        },
      ],
    },
    {
      org: "Independent",
      place: "Remote",
      span: "Jul 2021 — Present",
      roles: [
        {
          title: "Security Researcher",
          span: "Jul 2021 — Present",
          points: [
            "Research AI/ML frameworks, LLM applications, and machine learning infrastructure — source review, threat modeling, exploit development.",
            "Discovered CVEs in widely deployed open-source AI projects including LlamaIndex, Keras, MLflow, and LoLLMs.",
            "Work with maintainers to validate findings, coordinate disclosure, and verify fixes before they ship.",
          ],
        },
      ],
    },
    {
      org: "Security Lit / Capture The Bug",
      place: "New Zealand — Remote",
      span: "Jul 2024 — Jul 2025",
      roles: [
        {
          title: "Penetration Tester",
          span: "Jul 2024 — Jul 2025",
          points: [
            "Led client engagements end to end, delivering assessments and the findings that actually changed their posture.",
            "Tested web applications, mobile applications, APIs, and networks.",
            "Ran threat emulation alongside senior red team members and wrote the reports that went to the customer.",
          ],
        },
      ],
    },
    {
      org: "Infosec Writeups",
      place: "Remote",
      span: "Jan 2023 — Jan 2024",
      roles: [
        {
          title: "Ambassador",
          span: "Jan 2023 — Jan 2024",
          points: [
            "Curated and edited a weekly infosec newsletter reaching 1M+ monthly views.",
            "Managed ambassadors and sourced original community content.",
          ],
        },
      ],
    },
  ],

  projects: [
    {
      name: "Kryptonite",
      kind: "Tool",
      url: "https://github.com/yomananchill/Kryptonite",
      linkLabel: "github.com/yomananchill/Kryptonite",
      body:
        "RAM acquisition tool for forensic analysis on Windows and Linux, written in PowerShell and Python. Built for incident responders who need a memory image without a lengthy setup.",
      tags: ["DFIR", "PowerShell", "Python"],
    },
    {
      name: "SecureByte",
      kind: "Tool",
      url: "https://github.com/yomananchill/SecureByte",
      linkLabel: "github.com/yomananchill/SecureByte",
      body:
        "Python tool built alongside my published cryptography research, using layered AES + RSA encryption. Research artifact, published openly.",
      tags: ["Cryptography", "Python"],
    },
    {
      name: "Published Research",
      kind: "Paper",
      url: "https://www.jetir.org/view?paper=JETIR2403986",
      linkLabel: "JETIR, Vol. 11 Issue 3",
      body:
        "Peer-reviewed paper on combining symmetric and asymmetric cryptographic algorithms, published in the Journal of Emerging Technologies and Innovative Research.",
      tags: ["Cryptography", "Peer-reviewed"],
    },
  ],

  wins: [
    {
      title: "KhataBook Spark Award",
      rank: "Internal excellence award",
      when: "2025",
      body:
        "For carrying information security and audit across several legal entities at once, on deadlines set by regulators rather than by us.",
    },
    {
      title: "Pentathon",
      rank: "Finalist · top 25",
      when: "2024",
      body: "The national CTF run by AICTE and NCIIPC. Finished inside the top 25 of roughly eight thousand entrants.",
    },
    {
      title: "Anveshanam",
      rank: "Top 20",
      when: "2024",
      body: "Run by IIT Jammu with DRDO. Top twenty of about fifteen hundred.",
    },
    {
      title: "KAVACH",
      rank: "Finalist · top 5 of 3,900",
      when: "2023",
      body: "National hackathon. We built one-click memory acquisition for responders who need an image before somebody reboots the box. It became Kryptonite.",
    },
    {
      title: "HACKVENGERS",
      rank: "Winners · first of 120",
      when: "2023",
      body: "Won outright against a hundred and twenty teams over a single weekend build.",
    },
    {
      title: "IWCON CTF",
      rank: "Runners up",
      when: "2023",
      body: "Second place at the Infosec Writeups conference CTF, against a field of around a thousand.",
    },
  ],
};
