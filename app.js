/* ===========================================================================
   Router + views. No framework, no build step.
   =========================================================================== */

/* Evict the previous site's service worker. It was a PWA and serves cache-first,
   so without this a returning visitor keeps seeing the old Jekyll build. */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations?.().then((rs) => {
    rs.forEach((r) => r.unregister());
  }).catch(() => {});
  caches?.keys?.().then((ks) => ks.forEach((k) => caches.delete(k))).catch(() => {});
}

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

const I = DATA.identity;
const main = document.querySelector("#main");
const byDate = (a, b) => b.date.localeCompare(a.date);
const fmt = (d) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const FULL = REPORTS.filter((r) => r.depth === "full");
const POSTS_SORTED = () => [...(typeof POSTS !== "undefined" ? POSTS : [])].sort(byDate);
const SEV_RANK = { critical: 0, high: 1, medium: 2 };

const NAMES = {
  "keras-team/keras": "Keras",
  "mlflow/mlflow": "MLflow",
  "run-llama/llama_index": "LlamaIndex",
  "nltk/nltk": "NLTK",
  "feast-dev/feast": "Feast",
  "huggingface/transformers": "Transformers",
  "parisneo/lollms": "LoLLMs",
};
const pretty = (repo) => NAMES[repo] || repo;

/* ------------------------------------------------------------------ theme */

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

function setTheme(t) {
  document.documentElement.dataset.theme = t;
  store.set("theme", t);
}
setTheme(store.get("theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
document.querySelector(".theme").addEventListener("click", () =>
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark")
);

/* ------------------------------------------------------------------ chrome */

/* Shell prompt wordmark, plain ASCII throughout. The caret is the header's one
   live element. Built from identity so changing the handle updates it. */
const brandEl = document.querySelector(".brand");
brandEl.innerHTML =
  `<span class="p-user">${esc(I.handle)}</span>` +
  `<span class="p-dim">@</span>` +
  `<span class="p-host">${esc(I.alias.toLowerCase())}</span>` +
  `<span class="p-dim">:-$</span>` +
  `<span class="caret" aria-hidden="true"></span>`;

/* Hover peeks a fresh random memory byte into the cursor. */
{
  const caret = brandEl.querySelector(".caret");
  const byte = () =>
    "0x" + ((Math.random() * 256) | 0).toString(16).padStart(2, "0");
  brandEl.addEventListener("pointerenter", () => (caret.dataset.peek = byte()));
}

/* Publish the topbar's real height so sticky offsets stop being magic numbers.
   It changes when the header condenses and when the nav wraps at narrow widths. */
const topbar = document.querySelector(".topbar");
const setTopbarH = () =>
  document.documentElement.style.setProperty("--topbar-h", Math.round(topbar.getBoundingClientRect().height) + "px");
new ResizeObserver(setTopbarH).observe(topbar);
setTopbarH();

/* header condenses once you leave the top of the page */
addEventListener("scroll", () => {
  document.querySelector(".topbar").classList.toggle("condensed", scrollY > 24);
}, { passive: true });

/* nav labels scramble on hover - 40ms tick, 8 iterations */
const GLYPHS = "abcdefghijklmnopqrstuvwxyz!@#$%^&*()_+-=[]{}<>?/\\|~";
function scramble(el) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (el.dataset.busy) return;
  const real = el.dataset.text || el.textContent;
  el.dataset.text = real;
  el.dataset.busy = "1";
  let step = 0;
  const id = setInterval(() => {
    el.textContent = real
      .split("")
      .map((c, i) => (i < step / 1.1 || c === " " ? real[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
      .join("");
    if (++step > 8 || !el.isConnected) {
      clearInterval(id);
      if (el.isConnected) el.textContent = real;
      delete el.dataset.busy;
    }
  }, 40);
}
document.querySelectorAll(".nav a").forEach((a) =>
  a.addEventListener("mouseenter", () => scramble(a))
);

/* ------------------------------------------------------------------ footer */

const SOCIAL = [
  ["Email", `mailto:${I.email}`, I.email],
  ["GitHub", `https://github.com/${I.github}`, `@${I.github}`],
  ["Twitter", `https://x.com/${I.twitter}`, `@${I.twitter}`],
  ["LinkedIn", `https://linkedin.com/in/${I.linkedin}`, "in/manan-patel"],
];

document.querySelector(".foot").innerHTML = `
  <div class="foot-in">
    <div class="foot-lead">
      <p class="foot-name">${esc(I.name)}</p>
      <p class="foot-say">${esc(I.tagline)}</p>
      <p class="foot-status"><span class="live"></span>Open to disclosure coordination and research collaboration</p>
    </div>

    <nav class="foot-col" aria-label="Pages">
      <h4>Pages</h4>
      <a href="#/">Index</a>
      <a href="#/disclosures">Disclosures</a>
      <a href="#/audits">Audits</a>
      <a href="#/blogs">Blogs</a>
    </nav>

    <nav class="foot-col" aria-label="Elsewhere">
      <h4>Elsewhere</h4>
      ${SOCIAL.map(([t, h, sub]) => `<a href="${esc(h)}" rel="me noopener">${esc(t)}<span>${esc(sub)}</span></a>`).join("")}
    </nav>

    <div class="foot-col">
      <h4>Policy</h4>
      <p class="foot-note">
        Findings are published only after a fix has shipped publicly.
      </p>
    </div>
  </div>`;

/* ------------------------------------------------------------------ pieces */

const sevTag = (r) => `<span class="tag sev ${esc(r.sev)}">${esc(r.sev)}</span>`;

/* A "Duplicate" means someone else filed first, so the identifier is theirs.
   Showing it is fine; implying it was awarded here is not. */
const identOf = (r) => r.cve || r.ident || "";
const identTag = (r) => {
  const id = identOf(r);
  if (!id) return "";
  return `<span class="tag cve${r.credited ? "" : " uncredited"}"
    ${r.credited ? "" : 'title="Found independently - identifier assigned to the first reporter"'}>${esc(id)}</span>`;
};

const cardHTML = (r, i = 0) => {
  const open = r.depth === "full"
    ? `href="#/r/${esc(r.slug)}"`
    : `href="${esc(r.url)}" target="_blank" rel="noopener"`;
  return `
  <a class="card reveal" style="--sev:var(--sev-${esc(r.sev)});--i:${i}" ${open}>
    <div class="card-top">
      ${sevTag(r)}
      <span class="tag">${esc(r.cls)}</span>
      ${identTag(r)}
      ${r.state ? `<span class="tag state-${esc(r.state)}">${esc(r.state)}</span>` : ""}
    </div>
    <h3>${esc(r.short || r.title)}</h3>
    ${r.depth === "full"
      ? `<p>${esc(r.deck || r.summary)}</p>`
      : `<p class="held">Details held back until a fix ships publicly.</p>`}
    <div class="card-foot">
      <span>${esc(pretty(r.repo))}</span><span>${esc(fmt(r.date))}</span>
      ${r.cvss ? `<span>CVSS ${esc(r.cvss)}</span>` : ""}
      <span class="card-go">${r.depth === "full" ? "Read" : "Advisory"} <i>&rarr;</i></span>
    </div>
  </a>`;
};

const tileHTML = (p, i = 0) => `
  <div class="tile reveal" style="--i:${i}">
    <span class="area">${esc(p.area)}</span>
    <h3>${esc(p.name)}</h3>
    <p>${esc(p.note)}</p>
    <span class="langs">${p.langs.map((l) => `<b>${esc(l)}</b>`).join("")}</span>
  </div>`;

/* ------------------------------------------------------------------ home */

function viewHome() {
  /* One list, one size, one colour. */
  const hit = [...new Set(REPORTS.map((r) => r.repo))].map((r) => ({
    name: pretty(r),
    href: `#/disclosures?repo=${encodeURIComponent(r)}`,
    found: true,
  }));
  const reading = AUDITS.projects
    .filter((p) => !hit.some((h) => h.name.toLowerCase() === p.name.toLowerCase()))
    .map((p) => ({ name: p.name, href: `#/audits?lang=${encodeURIComponent(p.langs[0])}`, found: false }));
  const projects = [...hit, ...reading];

  const groups = [...new Set(DATA.clearances.map((c) => c.group))];

  return `
  <section class="hero">
    <div class="shell">
      <p class="namemark reveal" style="--i:0"><span class="dev">मनन</span><span class="namemark-sep" aria-hidden="true">&bull;</span><span class="namemark-rom">manan</span><span class="namemark-sep" aria-hidden="true">&bull;</span><span class="namemark-gloss">the one who thinks it through, then thinks again.</span></p>
      <p class="hero-kicker reveal" style="--i:1">${esc(I.role)} &middot; ${esc(I.location)}</p>
      <h1 class="reveal" style="--i:2">I read other people's code <em>until it breaks</em>.</h1>
      <p class="hero-lede reveal" style="--i:3">${esc(I.summary)}</p>
      <p class="hero-pay reveal" style="--i:4">${esc(I.payline)}</p>
      <div class="hero-meta reveal" style="--i:5">
        <a class="pill" href="#/disclosures">Disclosure record <i>&rarr;</i></a>
        <a class="pill" href="mailto:${esc(I.email)}">${esc(I.email)}</a>
        <a class="pill" href="https://github.com/${esc(I.github)}" rel="me noopener">@${esc(I.github)}</a>
      </div>

      <div class="namerows reveal" style="--i:6">
        <div class="namerow">
          <span class="nr-label">Working through<br>and disclosed findings</span>
          <p class="nr-list">${projects
            .map((p) => `<a href="${esc(p.href)}">${esc(p.name)}</a>`)
            .join("")}</p>
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="shell">
      <h2 class="sec-label">How I work</h2>
      <div class="method">
        <article class="step reveal" style="--i:0">
          <span class="step-n">01</span>
          <h3>Threat model first</h3>
          <p>Before I read any code I write one page: the project's past advisories, the bug
             classes that keep coming back, where the trust boundaries sit, and the handful of
             things that should always hold true. Everything after that gets checked against it.</p>
        </article>
        <article class="step reveal" style="--i:1">
          <span class="step-n">02</span>
          <h3>One surface at a time</h3>
          <p>I don't try to find everything. I pick one surface - a parser, path handling, an
             auth layer, how something gets deserialized - and read it properly. Going narrow
             turns up real bugs; going wide mostly turns up noise.</p>
        </article>
        <article class="step reveal" style="--i:2">
          <span class="step-n">03</span>
          <h3>Prove it or drop it</h3>
          <p>A finding isn't done until I have the exact call chain, a reproduction that works,
             and a patch that closes it. If I can't show it, I don't send it - maintainers get
             enough maybes already.</p>
        </article>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="shell">
      <h2 class="sec-label">Published findings</h2>
      <div class="cards">${[...FULL].sort(byDate).slice(0, 5).map(cardHTML).join("")}</div>
      <p class="more"><a class="pill" href="#/disclosures">All ${REPORTS.length} reports <i>&rarr;</i></a></p>
    </div>
  </section>

  <section class="section">
    <div class="shell">
      <h2 class="sec-label">Certifications</h2>
      <div class="certs">
        ${DATA.clearances
          .map(
            (c, i) => `<div class="cert reveal" style="--i:${i}">
              <b>${esc(c.id)}</b>
              <span class="cert-full">${esc(c.full)}</span>
              <span class="cert-by">${esc(c.by)}</span>
              <span class="cert-group">${esc(c.group)}</span>
            </div>`
          )
          .join("")}
      </div>
      <p class="certs-note">${groups.join(" and ")} tracks &middot; ${DATA.clearances.length} held</p>
    </div>
  </section>

  <section class="section">
    <div class="shell">
      <h2 class="sec-label">Service record</h2>
      <div class="rows">
        ${DATA.work
          .map(
            (j, i) => `<article class="row reveal" style="--i:${i}">
              <h3>${esc(j.org)}</h3>
              <span class="meta">${esc(j.span)} &middot; ${esc(j.place)}</span>
              ${j.roles
                .map((r) => `<ul><li class="lead-li">${esc(r.title)}</li>${r.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>`)
                .join("")}
            </article>`
          )
          .join("")}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="shell">
      <h2 class="sec-label">Tools &amp; papers</h2>
      <div class="two">
        ${DATA.projects
          .map(
            (p, i) => `<a class="box reveal" style="--i:${i}" href="${esc(p.url)}" target="_blank" rel="noopener">
              <span class="tag">${esc(p.kind)}</span>
              <h3>${esc(p.name)}</h3>
              <p>${esc(p.body)}</p>
              <span class="go">${esc(p.linkLabel)} <i>&rarr;</i></span>
            </a>`
          )
          .join("")}
      </div>
    </div>
  </section>

  <section class="section last">
    <div class="shell">
      <h2 class="sec-label">Commendations</h2>
      <div class="rows">
        ${DATA.wins
          .map(
            (w, i) => `<article class="row reveal" style="--i:${i}">
              <h3>${esc(w.title)}</h3>
              <span class="meta">${esc(w.rank)} &middot; ${esc(w.when)}</span>
              <p>${esc(w.body)}</p>
            </article>`
          )
          .join("")}
      </div>
    </div>
  </section>`;
}

/* ------------------------------------------------------------- disclosures */

/* Labelled dropdowns that combine: pick a class, a project, an attribution, or
   any mix, and search on top. Empty results just say so and offer a reset. */
const FILTERS = { q: "", cls: "", repo: "", cred: "", sort: "date" };

function viewDisclosures() {
  const classes = [...new Set(REPORTS.map((r) => r.cls))].sort();
  const repos = [...new Set(REPORTS.map((r) => r.repo))].sort();
  const opt = (v, label, sel) =>
    `<option value="${esc(v)}"${sel === v ? " selected" : ""}>${esc(label)}</option>`;

  return `
  <div class="shell">
    <div class="crumbs"><a href="#/">Index</a> <span>/</span> <span>Disclosures</span></div>
    <h1 class="page-h1">The disclosure record</h1>
    <p class="page-lede">
      ${REPORTS.length} accepted reports across ${repos.length} projects. Writeups
      go up once a fix ships.
    </p>
  </div>

  <div class="filters">
    <div class="shell">
      <div class="filter-row">
        <label class="search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
            <circle cx="11" cy="11" r="7"/><path d="M20 20l-4.3-4.3"/>
          </svg>
          <input type="search" id="q" placeholder="Search the record…" value="${esc(FILTERS.q)}">
          <kbd>/</kbd>
        </label>
        <label class="field">
          <span>Class</span>
          <select id="f-cls">
            ${opt("", "All classes", FILTERS.cls)}
            ${classes.map((c) => opt(c, c, FILTERS.cls)).join("")}
          </select>
        </label>
        <label class="field">
          <span>Project</span>
          <select id="f-repo">
            ${opt("", "All projects", FILTERS.repo)}
            ${repos.map((c) => opt(c, pretty(c), FILTERS.repo)).join("")}
          </select>
        </label>
        <label class="field">
          <span>Attribution</span>
          <select id="f-cred">
            ${opt("", "All reports", FILTERS.cred)}
            ${opt("credited", "Credited CVEs", FILTERS.cred)}
            ${opt("independent", "Independent", FILTERS.cred)}
          </select>
        </label>
        <label class="field sort">
          <span>Sort</span>
          <select id="sort">
            <option value="date">Newest</option>
            <option value="sev">Severity</option>
            <option value="repo">Project</option>
          </select>
        </label>
      </div>
    </div>
  </div>

  <div class="shell pb">
    <h2 class="sr-only">Reports</h2>
    <div class="count-row">
      <p class="result-count" id="count"></p>
      <button class="clear" id="clear" hidden>Clear filter</button>
    </div>
    <div class="cards" id="list"></div>
  </div>`;
}

function applyFilters() {
  const list = document.querySelector("#list");
  if (!list) return;
  const q = FILTERS.q.toLowerCase();

  const rows = REPORTS.filter((r) => {
    if (FILTERS.cls && r.cls !== FILTERS.cls) return false;
    if (FILTERS.repo && r.repo !== FILTERS.repo) return false;
    if (FILTERS.cred === "credited" && !r.credited) return false;
    if (FILTERS.cred === "independent" && r.credited) return false;
    if (!q) return true;
    return [r.title, r.short, r.cls, r.repo, pretty(r.repo), r.cve, r.ident, r.state]
      .join(" ").toLowerCase().includes(q);
  });

  rows.sort(
    FILTERS.sort === "sev"
      ? (a, b) => SEV_RANK[a.sev] - SEV_RANK[b.sev] || byDate(a, b)
      : FILTERS.sort === "repo"
      ? (a, b) => a.repo.localeCompare(b.repo) || byDate(a, b)
      : byDate
  );

  list.innerHTML = rows.length
    ? rows.map(cardHTML).join("")
    : `<p class="empty">Nothing matches that.<br><button class="linkish" id="reset">Clear the filter</button></p>`;
  document.querySelector("#reset")?.addEventListener("click", clearFilter);

  document.querySelector("#count").textContent =
    `${rows.length} of ${REPORTS.length} report${rows.length === 1 ? "" : "s"}`;
  document.querySelector("#clear").hidden =
    !(FILTERS.cls || FILTERS.repo || FILTERS.cred || FILTERS.q);

  const p = new URLSearchParams();
  if (FILTERS.q) p.set("q", FILTERS.q);
  if (FILTERS.cls) p.set("cls", FILTERS.cls);
  if (FILTERS.repo) p.set("repo", FILTERS.repo);
  if (FILTERS.cred) p.set("cred", FILTERS.cred);
  if (FILTERS.sort !== "date") p.set("sort", FILTERS.sort);
  const qs = p.toString();
  history.replaceState(null, "", "#/disclosures" + (qs ? "?" + qs : ""));
  revealAll();
}

function clearFilter() {
  FILTERS.cls = FILTERS.repo = FILTERS.cred = FILTERS.q = "";
  const q = document.querySelector("#q");
  if (q) q.value = "";
  ["#f-cls", "#f-repo", "#f-cred"].forEach((s) => {
    const el = document.querySelector(s);
    if (el) el.value = "";
  });
  applyFilters();
}

function wireDisclosures() {
  const input = document.querySelector("#q");
  input.addEventListener("input", (e) => { FILTERS.q = e.target.value; applyFilters(); });

  const bind = (sel, key) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.value = FILTERS[key];
    el.addEventListener("change", (e) => { FILTERS[key] = e.target.value; applyFilters(); });
  };
  bind("#f-cls", "cls");
  bind("#f-repo", "repo");
  bind("#f-cred", "cred");
  bind("#sort", "sort");

  document.querySelector("#clear").addEventListener("click", clearFilter);
  applyFilters();
}

/* ---------------------------------------------------------------- article */

function viewReport(slug) {
  const r = FULL.find((x) => x.slug === slug);
  if (!r) return `<div class="shell pb"><p class="empty">No such report.</p></div>`;

  const ordered = [...FULL].sort(byDate);
  const i = ordered.indexOf(r);
  const prev = ordered[i + 1];
  const next = ordered[i - 1];

  const sections = [
    ["summary", "Summary", r.summary],
    ["root-cause", "Root cause", r.root],
    ["impact", "Impact", r.impact],
    ["fix", "The fix", r.fix],
  ].filter(([, , b]) => b);

  const words = sections.map(([, , b]) => b).join(" ").split(/\s+/).length;

  return `
  <div class="shell">
    <div class="crumbs">
      <a href="#/">Index</a> <span>/</span>
      <a href="#/disclosures">Disclosures</a> <span>/</span>
      <span>${esc(r.cve || r.cls)}</span>
    </div>

    <header class="art-head">
      <p class="art-eyebrow"><b>${esc(r.cls)}</b>${(r.tags || []).map((t) => `<span>${esc(t)}</span>`).join("")}</p>
      <h1>${esc(r.title)}</h1>
      ${r.deck ? `<p class="art-deck">${esc(r.deck)}</p>` : ""}
      <p class="art-byline">
        <span class="who">${esc(I.name)}</span>
        <span>${esc(fmt(r.date))}</span>
        <span>${Math.max(1, Math.round(words / 200))} min read</span>
        ${sevTag(r)}
      </p>
    </header>

    <div class="art-wrap">
      <nav class="toc" aria-label="On this page">
        <h4>On this page</h4>
        <ol>
          ${sections.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join("")}
          <li><a href="#details">Details</a></li>
        </ol>
      </nav>

      <article class="prose">
        ${sections.map(([id, t, b]) => `<h2 id="${id}">${esc(t)}</h2><p>${esc(b)}</p>`).join("")}

        <h2 id="details">Details</h2>
        <dl class="art-facts">
          <div><dt>Project</dt><dd>${esc(r.repo)}</dd></div>
          <div><dt>Class</dt><dd>${esc(r.cls)}</dd></div>
          <div><dt>Severity</dt><dd>${esc(r.sev)}${r.cvss ? ` &middot; CVSS ${esc(r.cvss)}` : ""}</dd></div>
          <div><dt>Reported</dt><dd>${esc(fmt(r.date))}</dd></div>
          <div><dt>Status</dt><dd>${esc(r.state)}</dd></div>
          ${r.fixedIn ? `<div><dt>Fixed in</dt><dd>${esc(r.fixedIn)}</dd></div>` : ""}
          ${identOf(r) ? `<div>
            <dt>${r.credited ? "Identifier" : "Tracked upstream as"}</dt>
            <dd><a href="${esc(r.url)}" target="_blank" rel="noopener"
              class="${r.credited ? "" : "not-mine"}">${esc(identOf(r))} &nearr;</a></dd>
          </div>` : ""}
          <div><dt>Credit</dt><dd>${r.credited
            ? "Assigned to this report"
            : "Found independently; filed second"}</dd></div>
        </dl>

        <div class="callout">
          <p>${r.credited
            ? "Reported through coordinated disclosure and fixed upstream before publication."
            : "Found independently during my own review and reported through coordinated disclosure. Another researcher filed first, so the identifier above is credited to them. Published here only because the fix has since shipped."}</p>
        </div>

        <div class="prevnext">
          ${prev ? `<a href="#/r/${esc(prev.slug)}"><span>&larr; Previous</span><b>${esc(prev.short)}</b></a>` : "<span></span>"}
          ${next ? `<a class="nx" href="#/r/${esc(next.slug)}"><span>Next &rarr;</span><b>${esc(next.short)}</b></a>` : "<span></span>"}
        </div>
      </article>
    </div>
  </div>`;
}

let tocSpy;
function wireToc() {
  tocSpy?.disconnect();
  const links = [...document.querySelectorAll(".toc a")];
  const heads = links.map((a) => document.getElementById(a.getAttribute("href").slice(1))).filter(Boolean);
  if (!heads.length) return;
  const spy = tocSpy = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
    }),
    { rootMargin: "-92px 0px -68% 0px" }
  );
  heads.forEach((h) => spy.observe(h));
}

/* ----------------------------------------------------------------- audits */

let AUDIT_LANG = "";

function viewAudits() {
  const langs = [...new Set(AUDITS.projects.flatMap((p) => p.langs))].sort();
  return `
  <div class="shell pb">
    <div class="crumbs"><a href="#/">Index</a> <span>/</span> <span>Audits</span></div>
    <h1 class="page-h1">Where I've been reading</h1>
    <p class="page-lede">${esc(AUDITS.note)}</p>

    <div class="chiprow standalone">
      <span class="chip-label">Language</span>
      <div class="chips" id="lang-chips">
        ${langs.map((l) => `<button class="chip" data-lang="${esc(l)}" aria-pressed="${String(l === AUDIT_LANG)}">${esc(l)}</button>`).join("")}
      </div>
    </div>

    <h2 class="sr-only">Codebases</h2>
    <div class="grid" id="tiles"></div>
  </div>`;
}

function paintTiles() {
  const shown = AUDITS.projects.filter((p) => !AUDIT_LANG || p.langs.includes(AUDIT_LANG));
  document.querySelector("#tiles").innerHTML = shown.map(tileHTML).join("");
  revealAll();
}

function wireAudits() {
  document.querySelectorAll("#lang-chips .chip").forEach((b) => {
    b.addEventListener("click", () => {
      AUDIT_LANG = AUDIT_LANG === b.dataset.lang ? "" : b.dataset.lang;
      document.querySelectorAll("#lang-chips .chip").forEach((x) =>
        x.setAttribute("aria-pressed", String(x.dataset.lang === AUDIT_LANG)));
      paintTiles();
      history.replaceState(null, "", "#/audits" + (AUDIT_LANG ? "?lang=" + encodeURIComponent(AUDIT_LANG) : ""));
    });
  });
  paintTiles();
}

/* ------------------------------------------------------------- writing */

/* A deliberately small Markdown subset, written here rather than pulled from a
   CDN so the blog cannot introduce a dependency that breaks the rest of the
   site. Everything is escaped first, then markup is applied to the escaped
   text, so post content can never inject HTML. */
function md(src) {
  const esc0 = (t) => esc(t);
  const inline = (t) =>
    esc0(t)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,
        '<img src="$2" alt="$1" loading="lazy">')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>');

  const out = [];
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  let i = 0, para = [], list = null;

  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  const openList = (tag) => { if (list !== tag) { flushList(); out.push(`<${tag}>`); list = tag; } };

  while (i < lines.length) {
    const ln = lines[i];

    if (/^```/.test(ln)) {                       // fenced code
      flushPara(); flushList();
      const body = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc0(body.join("\n"))}</code></pre>`);
      continue;
    }
    if (/^\s*$/.test(ln)) { flushPara(); flushList(); i++; continue; }
    if (/^---+\s*$/.test(ln)) { flushPara(); flushList(); out.push("<hr>"); i++; continue; }

    const h = ln.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushPara(); flushList();
      const lvl = Math.min(4, h[1].length + 1);   // the page h1 is the title
      const id = h[2].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      out.push(`<h${lvl} id="${esc(id)}">${inline(h[2])}</h${lvl}>`);
      i++; continue;
    }
    const q = ln.match(/^>\s?(.*)$/);
    if (q) { flushPara(); flushList(); out.push(`<blockquote><p>${inline(q[1])}</p></blockquote>`); i++; continue; }

    const ul = ln.match(/^[-*]\s+(.*)$/);
    if (ul) { flushPara(); openList("ul"); out.push(`<li>${inline(ul[1])}</li>`); i++; continue; }
    const ol = ln.match(/^\d+\.\s+(.*)$/);
    if (ol) { flushPara(); openList("ol"); out.push(`<li>${inline(ol[1])}</li>`); i++; continue; }

    flushList();
    para.push(ln.trim());
    i++;
  }
  flushPara(); flushList();
  return out.join("\n");
}

function viewBlogs() {
  const list = POSTS_SORTED();
  return `
  <div class="shell pb">
    <div class="crumbs"><a href="#/">Index</a> <span>/</span> <span>Blogs</span></div>
    <h1 class="page-h1">Blogs</h1>
    <p class="page-lede">Notes on what I have been reading and breaking.</p>
    <h2 class="sr-only">Posts</h2>
    ${list.length
      ? `<div class="cards">${list.map((p, i) => `
          <a class="card post-card reveal" style="--i:${i}" href="#/b/${esc(p.slug)}">
            <div class="card-top">${(p.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
            <h3>${esc(p.title)}</h3>
            <p>${esc(p.summary || "")}</p>
            <div class="card-foot"><span>${esc(fmt(p.date))}</span>
              <span class="card-go">Read <i>&rarr;</i></span></div>
          </a>`).join("")}</div>`
      : `<p class="empty">Nothing published yet.<br>
           <span style="font-size:14px">Writeups on the disclosure record are
           <a href="#/disclosures">over here</a>.</span></p>`}
  </div>`;
}

function viewPost(slug) {
  const p = POSTS_SORTED().find((x) => x.slug === slug);
  if (!p) return `<div class="shell pb"><p class="empty">No such post.</p></div>`;

  queueMicrotask(async () => {
    const body = document.querySelector("#post-body");
    if (!body) return;
    try {
      const res = await fetch(`posts/${encodeURIComponent(slug)}.md`, { cache: "no-cache" });
      if (!res.ok) throw new Error(res.status);
      body.innerHTML = md(await res.text());
    } catch {
      body.innerHTML =
        `<p class="empty">This post's file could not be loaded.<br>` +
        `Expected <code>posts/${esc(slug)}.md</code>.</p>`;
    }
  });

  return `
  <div class="shell">
    <div class="crumbs">
      <a href="#/">Index</a> <span>/</span>
      <a href="#/blogs">Blogs</a> <span>/</span>
      <span>${esc(p.date)}</span>
    </div>
    <header class="art-head">
      <p class="art-eyebrow">${(p.tags || []).map((t) => `<span>${esc(t)}</span>`).join("")}</p>
      <h1>${esc(p.title)}</h1>
      ${p.summary ? `<p class="art-deck">${esc(p.summary)}</p>` : ""}
      <p class="art-byline"><span class="who">${esc(I.name)}</span><span>${esc(fmt(p.date))}</span></p>
    </header>
    <article class="prose" id="post-body"><p class="empty">Loading…</p></article>
    <div style="padding-bottom:var(--s9)"></div>
  </div>`;
}

/* A chip row that wraps to leave a single item on the last line reads as a
   mistake. Pick the column count that avoids it. */
function fitChips() {
  document.querySelectorAll(".chips").forEach((box) => {
    const n = box.children.length;
    if (!n) return;
    const gap = 8, min = 150;
    const max = Math.max(1, Math.floor((box.clientWidth + gap) / (min + gap)));
    let c = Math.min(n, max);
    while (c > 2 && n % c === 1) c--;
    box.style.setProperty("--cols", c);
    /* at narrow widths there may be no column count that avoids a lone trailing
       chip, so let that one stretch across instead of sitting by itself */
    [...box.children].forEach((el) => el.classList.remove("span"));
    if (c > 1 && n % c === 1) box.lastElementChild.classList.add("span");
  });
}
addEventListener("resize", fitChips, { passive: true });

/* ------------------------------------------------------------- animations */

/* Opt into the hidden-then-revealed state only once JS is running, so a script
   failure leaves the content visible rather than blank. */
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.documentElement.classList.add("anim");
}

let io, revealFallback;
function revealAll() {
  io?.disconnect();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
    return;
  }
  io = new IntersectionObserver(
    (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
    { rootMargin: "0px 0px -6% 0px", threshold: 0.01 }
  );
  document.querySelectorAll(".reveal:not(.in)").forEach((el) => io.observe(el));

  /* If the observer never fires - hidden document, odd webview - show everything
     anyway rather than leaving the page empty. */
  clearTimeout(revealFallback);
  revealFallback = setTimeout(() => {
    document.querySelectorAll(".reveal:not(.in)").forEach((el) => {
      if (el.getBoundingClientRect().top < innerHeight) el.classList.add("in");
    });
  }, 1200);
}

/* In-page anchors must not reach the hash router. "#impact" would parse as the
   route "impact", match nothing, and fall through to the home view. */
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const href = a.getAttribute("href");
  if (href === "#" || href.startsWith("#/")) return;   // route links pass through
  const el = document.getElementById(href.slice(1));
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
  el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
});

/* ---------------------------------------------------------------- router */

function parse() {
  const raw = location.hash.slice(1) || "/";
  const [path, query] = raw.split("?");
  return { path, params: new URLSearchParams(query || "") };
}

function paint() {
  const { path, params } = parse();

  document.querySelectorAll(".nav a").forEach((a) => {
    const r = a.dataset.route;
    const on = r === path || (r !== "/" && path.startsWith(r)) || (r === "/disclosures" && path.startsWith("/r/"));
    a.setAttribute("aria-current", on ? "page" : "false");
  });

  if (path.startsWith("/r/")) {
    main.innerHTML = viewReport(path.slice(3));
    wireToc();
  } else if (path === "/disclosures") {
    FILTERS.q = params.get("q") || "";
    FILTERS.cls = params.get("cls") || "";
    FILTERS.repo = params.get("repo") || "";
    FILTERS.cred = params.get("cred") || "";
    FILTERS.sort = params.get("sort") || "date";
    main.innerHTML = viewDisclosures();
    wireDisclosures();
  } else if (path === "/blogs" || path === "/writing") {
    main.innerHTML = viewBlogs();
  } else if (path.startsWith("/b/") || path.startsWith("/w/")) {
    main.innerHTML = viewPost(path.slice(3));
  } else if (path === "/audits") {
    AUDIT_LANG = params.get("lang") || "";
    main.innerHTML = viewAudits();
    wireAudits();
  } else {
    main.innerHTML = viewHome();
  }

  revealAll();
  fitChips();

  const rep = path.startsWith("/r/") && FULL.find((x) => x.slug === path.slice(3));
  const label = rep ? rep.short
    : path === "/disclosures" ? "Disclosures"
    : path === "/audits" ? "Audits"
    : (path === "/blogs" || path === "/writing") ? "Blogs"
    : (path.startsWith("/b/") || path.startsWith("/w/"))
        ? (POSTS_SORTED().find((x) => x.slug === path.slice(3))?.title || "Blogs")
    : "";
  document.title = label ? `${label} - ${I.name}` : `${I.name} - ${I.role}`;

  /* move focus to the new view so keyboard and screen-reader users are not
     left at the top of a page that silently changed under them */
  main.setAttribute("tabindex", "-1");
  main.focus({ preventScroll: true });
  scrollTo({ top: 0, behavior: "instant" });
}

/* View transitions were removed deliberately: inside an embedded webview the
   transition aborts with InvalidStateError and rejects promises that cannot be
   reliably caught, and the staggered reveals already carry the motion. */
function render() {
  paint();
}

addEventListener("hashchange", () => {
  const h = location.hash;
  if (h && !h.startsWith("#/")) return;   // in-page anchor, handled above
  render();
});

addEventListener("keydown", (e) => {
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    if (e.key === "Escape") document.activeElement.blur();
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "/") { e.preventDefault(); document.querySelector("#q")?.focus(); }
  if (e.key === "t") document.querySelector(".theme").click();
});

render();

/* ===========================================================================
   Easter eggs. None of it is load-bearing; all of it is for the people who
   poke. Wrapped so a failure here can never take the page down.
   =========================================================================== */
(() => {
  try {
    const A = "color:#a8301f;font-family:monospace;font-size:12px";
    const D = "color:#888;font-family:monospace;font-size:12px";
    const line = (s, c = D) => console.log("%c" + s, c);
    const ok = (s) => line(s, A);

    /* 1. A console banner for whoever opens devtools first. */
    console.log("%c" + [
      "                                       _ _ _ ",
      " _  _ ___ _ __  __ _ _ _  __ _ _ _  __| | | |",
      "| || / _ \\ '  \\/ _` | ' \\/ _` | ' \\/ _| | | |",
      " \\_, \\___/_|_|_\\__,_|_||_\\__,_|_||_\\__|_|_|_|",
      " |__/                                        ",
    ].join("\n"), A);
    line(`${I.handle}@${I.alias.toLowerCase()}:~$ whoami`, A);
    line("curious, aren't you. type help() and see what's lying around.");

    /* 2. Callable console commands. Real hackers try them. */
    const ret = (v) => v;
    window.help = () => (
      line("available:", A),
      line('  whoami()   ls()   cd("dir")   cat("file")   sudo()   nmap()'),
      line("  exploit()   security()   flag()   matrix()"),
      line("  the konami code suits a hacker like you - try it on the page."),
      ret("try one. some of them lead somewhere.")
    );
    window.whoami = () => (
      line("manan patel  aka 0xManan", A),
      line("security researcher / bengaluru / reads other people's code until it breaks"),
      ret("you. probably.")
    );
    window.sudo = (c) => (line("[sudo] password for guest: ********"), line("nice try.", A), ret("guest is not in the sudoers file. this incident will be reported."));

    /* A tiny fake filesystem so ls/cd/cat feel like a real shell. */
    let cwd = "~";
    const FS = {
      "~": ["disclosures/", "audits/", "blogs/", ".secrets/"],
      ".secrets": ["flag.txt", "note.md"],
    };
    const FILES = {
      "flag.txt": "flag{you_read_the_source_now_read_the_code}",
      "note.md":
        "you dug this far, so - hi. if you found something real in here, or in\n" +
        "anything I've disclosed, that's the best possible way to say hello.\n" +
        "mail: " + I.email + "  //  the good bugs get a reply within the hour.",
    };
    window.ls = () => (line((FS[cwd] || []).join("   ")), ret(cwd === "~" ? "the last one isn't for everyone." : ""));
    window.cd = (dir = "") => {
      dir = String(dir).replace(/^\.\//, "").replace(/\/$/, "");
      if (dir === "" || dir === "~" || dir === "..") { cwd = "~"; return ret("~"); }
      if ((dir === ".secrets" || dir === "secrets") ) { cwd = ".secrets"; ok("access granted. you actually looked."); line("ls   ->   flag.txt   note.md"); return ret("~/.secrets"); }
      if (["disclosures", "audits", "blogs"].includes(dir)) { location.hash = "#/" + dir; return ret("opening /" + dir + " ..."); }
      return ret("cd: " + dir + ": No such file or directory");
    };
    window.cat = (f = "") => {
      f = String(f).replace(/^\.secrets\//, "").replace(/^\.\//, "");
      if (f === "/etc/passwd" || f === "etc/passwd") return ret("nice try.");
      if (FILES[f]) { (f === "flag.txt" ? ok : line)(FILES[f]); return ret(""); }
      return ret("cat: " + f + ": No such file or directory");
    };
    window.nmap = () => (line("Starting scan..."), line("PORT    STATE  SERVICE"), line("443/tcp open   https"), line("host is clean.", A), ret("try harder."));
    window.exploit = () => (line("no live targets here.", A), ret("the ones that ARE fixed are on /disclosures."));
    window.security = () => (line("found a bug in something? that's the best kind of hello.", A), line("disclosure policy + contact: /.well-known/security.txt (RFC 9116)."), ret(""));
    window.flag = () => (line("flags don't announce themselves.", A), line("you already ran ls(). one of those wasn't meant for you."), ret(""));
    window.matrix = () => (rain(), ret("it's raining. reload to make it stop."));

    /* 3. Konami -> root mode. Wordmark flips to a red root shell, the page
          tints, and the hex field goes hot. Enter it again to drop back. */
    const KONAMI = ["arrowup","arrowup","arrowdown","arrowdown","arrowleft","arrowright","arrowleft","arrowright","b","a"];
    let k = 0, rooted = false;
    const brand = document.querySelector(".brand");

    function toggleRoot() {
      rooted = !rooted;
      document.documentElement.classList.toggle("rooted", rooted);
      if (rooted) {
        brand.dataset.saved = brand.innerHTML;
        brand.innerHTML =
          `<span class="p-user" style="color:var(--accent)">root</span>` +
          `<span class="p-dim">@</span><span class="p-host">${esc(I.alias.toLowerCase())}</span>` +
          `<span class="p-dim">:~#</span><span class="caret" aria-hidden="true"></span>`;
        toast("root shell acquired. you didn't get that from me.");
        line("privilege escalated. uid=0(root). enjoy responsibly.", A);
      } else {
        if (brand.dataset.saved) brand.innerHTML = brand.dataset.saved;
        toast("dropped back to guest.");
      }
    }

    /* 4. A tiny transient toast. */
    let toastEl;
    function toast(msg) {
      if (!toastEl) {
        toastEl = document.createElement("div");
        toastEl.className = "egg-toast";
        document.body.appendChild(toastEl);
      }
      toastEl.textContent = msg;
      toastEl.classList.add("show");
      clearTimeout(toast._t);
      toast._t = setTimeout(() => toastEl.classList.remove("show"), 2600);
    }

    /* 5. Hex rain (matrix(), and once as the konami payload flourish). */
    function rain() {
      const cv = document.createElement("canvas");
      cv.className = "egg-rain";
      document.body.appendChild(cv);
      const ctx = cv.getContext("2d");
      let W, H, cols, drops;
      const size = () => {
        W = cv.width = innerWidth; H = cv.height = innerHeight;
        cols = Math.floor(W / 14); drops = Array(cols).fill(0);
      };
      size();
      const HEX = "0123456789abcdef";
      const tick = () => {
        ctx.fillStyle = "rgba(0,0,0,0.08)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#a8301f";
        ctx.font = "13px monospace";
        drops.forEach((y, i) => {
          ctx.fillText(HEX[(Math.random() * 16) | 0], i * 14, y * 14);
          drops[i] = y * 14 > H && Math.random() > 0.975 ? 0 : y + 1;
        });
        raf = requestAnimationFrame(tick);
      };
      let raf = requestAnimationFrame(tick);
      addEventListener("resize", size, { passive: true });
      return () => { cancelAnimationFrame(raf); cv.remove(); };
    }

    /* 6. Key handling. Two ways in: the easy one (~, the terminal key) and the
          konami sequence for the ones who know it. Plus type-triggers. */
    let typed = "";
    addEventListener("keydown", (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const key = (e.key || "").toLowerCase();

      if (key === "`" || key === "~") { toggleRoot(); return; }   // easy trigger

      k = key === KONAMI[k] ? k + 1 : (key === KONAMI[0] ? 1 : 0);
      if (k === KONAMI.length) { k = 0; toggleRoot(); }

      if (key.length === 1) {
        typed = (typed + key).slice(-6);
        if (typed.endsWith("sudo")) toast("this isn't your shell.");
        else if (typed.endsWith("root")) toast("a hacker like you knows the konami code. use it.");
        else if (typed.endsWith("flag")) toast("flags don't announce themselves. open the console, run ls().");
      }
    });

    /* 7. A view-source note for whoever reads the markup. */
    /* (A view-source note lives as a comment in index.html.) */
  } catch (e) { /* eggs never break the page */ }
})();
