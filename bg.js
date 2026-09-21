/* ===========================================================================
   Background — a live hex view with a scanning reticle.

   Not decoration borrowed from a sci-fi film: this is the thing the work
   actually looks like. An address gutter, sixteen bytes a row, memory that
   churns, and a reticle that follows the cursor and decodes what is under it.
   Rows whose bytes match a pattern flash briefly, the way a scan reports hits.

   Canvas 2D so it runs everywhere. Reduced motion or a touch device renders a
   single static frame. Nothing here is load-bearing: if it throws, it removes
   itself and the page is unaffected.
   =========================================================================== */

(() => {
  try {
    const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = () => matchMedia("(pointer: coarse)").matches;
    const still = () => reduced() || coarse();

    const cv = document.createElement("canvas");
    cv.className = "bgfield";
    cv.setAttribute("aria-hidden", "true");
    document.body.prepend(cv);
    const ctx = cv.getContext("2d");
    if (!ctx) { cv.remove(); return; }

    /* The field is masked and dimmed; the cursor must not inherit either. */
    const ui = document.createElement("canvas");
    ui.className = "cursorlayer";
    ui.setAttribute("aria-hidden", "true");
    document.body.prepend(ui);
    const uctx = ui.getContext("2d");

    const HEX = "0123456789abcdef";
    const COLW = 21;          // px per byte column
    const ROWH = 19;          // px per row
    const GUTTER = 92;        // address column width
    const PER_ROW = 16;

    let W = 0, H = 0, rows = 0, cols = 0, dpr = 1;
    let bytes = [];           // flat byte store
    let hot = [];             // per-byte recency, 0..1
    let baseAddr = 0x7ffd4000;
    let raf = null, lastChurn = 0, lastFrame = 0;
    let tx = -1e4, ty = -1e4, mx = -1e4, my = -1e4, power = 0, targetPower = 0;
    let hitRow = -1, hitUntil = 0;

    const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    let INK = "#000", ACCENT = "#a8301f", DIM = "#888", PAPER = "#fff";

    function palette() {
      INK = css("--fg");
      DIM = css("--fg-3");
      ACCENT = css("--accent");
      PAPER = css("--bg");
    }

    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      cv.width = Math.floor(W * dpr);
      cv.height = Math.floor(H * dpr);
      cv.style.width = W + "px";
      cv.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.textBaseline = "top";

      ui.width = cv.width; ui.height = cv.height;
      ui.style.width = W + "px"; ui.style.height = H + "px";
      uctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      uctx.textBaseline = "top";

      rows = Math.ceil(H / ROWH) + 1;
      cols = PER_ROW;
      const need = rows * cols;
      while (bytes.length < need) { bytes.push((Math.random() * 256) | 0); hot.push(0); }
      bytes.length = need; hot.length = need;
    }

    /* memory churns: a handful of bytes change every tick, like a live process */
    function churn() {
      const n = 14;
      for (let i = 0; i < n; i++) {
        const k = (Math.random() * bytes.length) | 0;
        bytes[k] = (Math.random() * 256) | 0;
        hot[k] = 1;
      }
      if (Math.random() < 0.09) {
        hitRow = (Math.random() * rows) | 0;
        hitUntil = performance.now() + 620;
      }
    }

    const printable = (b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : ".");

    function render(now) {
      ctx.clearRect(0, 0, W, H);

      // the reading column sits left; the view lives right of it
      const startX = Math.max(W * 0.46, W - (GUTTER + PER_ROW * COLW + 150));
      const inReticle = power > 0.02;
      const rx = mx, ry = my;
      const RW = 150, RH = 74;

      ctx.font = `12px "JetBrains Mono", ui-monospace, monospace`;

      for (let r = 0; r < rows; r++) {
        const y = r * ROWH;
        const rowHit = r === hitRow && now < hitUntil;

        // address gutter
        ctx.fillStyle = DIM;
        ctx.globalAlpha = 0.13;
        ctx.fillText(
          (baseAddr + r * PER_ROW).toString(16).padStart(8, "0"),
          startX, y
        );

        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const b = bytes[i];
          const x = startX + GUTTER + c * COLW;
          if (x > W) break;

          const near = inReticle
            && Math.abs(x - rx) < RW && Math.abs(y - ry) < RH;

          let a = 0.1 + hot[i] * 0.34;
          let col = INK;

          if (rowHit) { a = 0.38; col = ACCENT; }
          if (near) { a = 0.6; col = ACCENT; }

          ctx.globalAlpha = Math.min(0.7, a);
          ctx.fillStyle = col;
          ctx.fillText(HEX[b >> 4] + HEX[b & 15], x, y);

          hot[i] *= 0.955;
        }

        // decoded ascii for the row the reticle is on
        if (inReticle && Math.abs(y - ry) < RH) {
          let sAscii = "";
          for (let c = 0; c < cols; c++) sAscii += printable(bytes[r * cols + c]);
          ctx.globalAlpha = 0.5 * power;
          ctx.fillStyle = INK;
          ctx.fillText(sAscii, startX + GUTTER + cols * COLW + 18, y);
        }
      }

      // cursor layer: 1px crosshair, an 8x8 marker, and a live readout
      uctx.clearRect(0, 0, W, H);
      if (inReticle) {
        const x = Math.round(rx) + 0.5, y = Math.round(ry) + 0.5;

        uctx.globalAlpha = 0.14 * power;
        uctx.strokeStyle = INK;
        uctx.lineWidth = 1;
        uctx.beginPath();
        uctx.moveTo(0, y); uctx.lineTo(W, y);
        uctx.moveTo(x, 0); uctx.lineTo(x, H);
        uctx.stroke();

        // an outline, not a block: the system arrow marks the point, this frames it
        uctx.globalAlpha = 0.4 * power;
        uctx.strokeStyle = INK;
        uctx.lineWidth = 1;
        uctx.strokeRect(x - 6.5, y - 6.5, 13, 13);

        uctx.globalAlpha = 0.26 * power;
        uctx.font = `10px "JetBrains Mono", ui-monospace, monospace`;
        uctx.fillText(`x: ${Math.round(rx)}`, rx + 15, ry - 40);
        uctx.fillText(`y: ${Math.round(ry)}`, rx + 15, ry - 27);
      }
      uctx.globalAlpha = 1;

      ctx.globalAlpha = 1;
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (now - lastFrame < 42) return;        // ~24fps
      lastFrame = now;
      if (now - lastChurn > 90) { churn(); lastChurn = now; }

      mx += (tx - mx) * 0.14;
      my += (ty - my) * 0.14;
      power += (targetPower - power) * 0.08;
      baseAddr = (baseAddr + 16) >>> 0;        // the window scrolls through memory

      render(now);
    }

    function start() { if (!raf && !still()) raf = requestAnimationFrame(frame); }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = null; }

    addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;
      tx = e.clientX; ty = e.clientY; targetPower = 1;
    }, { passive: true });
    addEventListener("pointerleave", () => { targetPower = 0; }, { passive: true });

    addEventListener("scroll", () => {
      // keep the base 0.62 from CSS rather than overriding it back to 1
      cv.style.opacity = (0.62 * Math.max(0.16, 1 - scrollY / 620)).toFixed(3);
      // the cursor overlay belongs to the hero; sweeping lines across body copy
      // while someone is reading is just noise
      ui.style.opacity = Math.max(0, 1 - scrollY / 420).toFixed(3);
    }, { passive: true });

    addEventListener("resize", () => { size(); if (still()) render(performance.now()); }, { passive: true });
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    new MutationObserver(() => { palette(); if (still()) render(performance.now()); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    palette();
    size();
    render(performance.now());
    start();

  } catch (e) {
    document.querySelector(".bgfield")?.remove();
    document.querySelector(".cursorlayer")?.remove();
  }
})();
