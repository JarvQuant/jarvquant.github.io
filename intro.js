// Opening sequence for the JarvQuant 2.0 launch. No dependencies, nothing is stored in the browser.
// The inline script in index.html decides whether it plays and sets html.intro-on, which keeps a
// curtain over the page until this module takes over. Six scenes with hard cuts: the old version
// struck out, three features, the changelog as a wall, then "2.0" built from candles, and the camera
// flies through the zero into the page. Any click, key, scroll or touch ends it at once, and the
// header with its download button stays above the curtain the whole time.
import { I18N, resolveLang } from "./i18n.js?v=3";

const root = document.documentElement;
const EASE = "cubic-bezier(.2,.7,.2,1)";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// "2.0" on a 5 x 7 dot grid; every dot becomes a candle.
const GLYPH = {
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  ".": ["0", "0", "0", "0", "0", "0", "1"],
  0: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
};

// Drawn stand-ins for the three features (no screenshots: they would age with every release).
const ART = [
  `<svg viewBox="0 0 520 360">
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path class="s" pathLength="1" d="M24 318 L318 96" stroke="#33c6e3" stroke-width="3.5"/>
      <path class="s" pathLength="1" d="M236 110 H500" stroke="rgba(232,235,240,.6)" stroke-width="1.8"/>
      <path class="s" pathLength="1" d="M236 166 H500" stroke="rgba(232,235,240,.6)" stroke-width="1.8"/>
      <path class="s" pathLength="1" d="M236 208 H500" stroke="rgba(232,235,240,.6)" stroke-width="1.8"/>
      <path class="s" pathLength="1" d="M236 276 H500" stroke="rgba(232,235,240,.6)" stroke-width="1.8"/>
    </g>
    <circle class="f" cx="24" cy="318" r="7" fill="#08090c" stroke="#33c6e3" stroke-width="3"/>
    <circle class="f" cx="318" cy="96" r="7" fill="#08090c" stroke="#33c6e3" stroke-width="3"/>
    <g class="f" font-family="Geist Mono, monospace" font-size="15" fill="#b3b9c5"><text x="440" y="102">0.382</text><text x="458" y="158">0.5</text><text x="440" y="200">0.618</text><text x="476" y="268">1</text></g>
    <rect class="f" x="64" y="30" width="150" height="72" fill="rgba(34,195,154,.18)" stroke="#22c39a" stroke-width="1.8"/>
    <rect class="f" x="64" y="102" width="150" height="38" fill="rgba(240,97,109,.18)" stroke="#f0616d" stroke-width="1.8"/>
    <text class="f" x="76" y="56" font-family="Geist Mono, monospace" font-size="16" fill="#22c39a">+2.0R</text>
  </svg>`,
  `<div class="rows">
    <div class="row f"><span>NQ</span><span>Long</span><b class="pos">+2.0R</b></div>
    <div class="row f"><span>NQ</span><span>Short</span><b class="neg">-1.0R</b></div>
    <div class="row f"><span>GC</span><span>Long</span><b class="pos">+1.4R</b></div>
    <div class="row f"><span>ES</span><span>Long</span><b class="neg">-1.0R</b></div>
    <div class="row f"><span>NQ</span><span>Short</span><b class="pos">+2.6R</b></div>
  </div>`,
  `<svg viewBox="0 0 520 360">
    <g fill="none" stroke="rgba(232,235,240,.6)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">
      <path class="s" pathLength="1" d="M22 20 H498 A12 12 0 0 1 510 32 V328 A12 12 0 0 1 498 340 H22 A12 12 0 0 1 10 328 V32 A12 12 0 0 1 22 20 Z"/>
      <path class="s" pathLength="1" d="M118 20 V340"/>
      <path class="s" pathLength="1" d="M118 62 H510"/>
      <path class="s" pathLength="1" d="M138 84 H248 V168 H138 Z"/>
      <path class="s" pathLength="1" d="M262 84 H372 V168 H262 Z"/>
      <path class="s" pathLength="1" d="M386 84 H490 V168 H386 Z"/>
      <path class="s" pathLength="1" d="M138 184 H490 V320 H138 Z"/>
      <path class="s" pathLength="1" d="M150 300 L196 270 L232 284 L286 232 L330 246 L388 206 L430 216 L478 196" stroke="#33c6e3" stroke-width="3"/>
    </g>
    <rect class="f" x="24" y="74" width="80" height="20" rx="5" fill="rgba(51,198,227,.2)" stroke="#33c6e3" stroke-width="1.4"/>
    <g class="f" fill="rgba(232,235,240,.28)"><rect x="24" y="106" width="64" height="8" rx="4"/><rect x="24" y="130" width="72" height="8" rx="4"/><rect x="24" y="154" width="54" height="8" rx="4"/><rect x="24" y="178" width="68" height="8" rx="4"/></g>
  </svg>`,
];

// Scene lengths in ms.
const PRE = 1300, CARD = 1650, MORE = 1500, HOLD = 1900, OUT = 720;

function reveal() {
  root.classList.remove("intro-on", "intro-run");
}

async function run() {
  root.classList.add("intro-run"); // tells the inline fallback timer that the module has arrived
  const dict = I18N[resolveLang()] || I18N.en;
  const tr = (k) => esc(dict[k] ?? I18N.en[k] ?? "");

  // Wait briefly for the headline font so the first scene does not swap typefaces mid-cut.
  try {
    await Promise.race([
      Promise.all([document.fonts.load("650 100px Geist", "16"), document.fonts.load("500 14px 'Geist Mono'", "+")]),
      new Promise((r) => setTimeout(r, 800)),
    ]);
  } catch { /* the fallback font is fine */ }
  if (document.hidden || window.scrollY > 0 || !root.classList.contains("intro-on")) return reveal();

  const W = window.innerWidth, H = window.innerHeight;
  const CARDS = 3;
  const MORE0 = PRE + CARD * CARDS, SLAM = MORE0 + MORE, EXIT = SLAM + HOLD, END = EXIT + OUT;
  const scenes = [[0, PRE], ...Array.from({ length: CARDS }, (_, i) => [PRE + i * CARD, PRE + (i + 1) * CARD]), [MORE0, SLAM], [SLAM, EXIT]];

  const items = (dict["intro.wall"] ?? I18N.en["intro.wall"]).split("|");
  const cols = W < 700 ? 2 : 4;
  const per = Math.ceil(items.length / cols);
  const wall = Array.from({ length: cols }, (_, i) => {
    const part = items.slice(i * per, (i + 1) * per).map((s) => `<span>+ ${esc(s)}</span>`).join("");
    return `<div class="col">${part.repeat(4)}</div>`;
  }).join("");
  const cards = ART.map((art, i) => {
    const big = tr(`intro.c${i + 1}.big`);
    return `<div class="ik-card" style="--n:${big.length}">
      <div class="ik-text"><div class="big">${big}</div><div class="line">${tr(`intro.c${i + 1}.line`)}</div><div class="punch">${tr(`intro.c${i + 1}.punch`)}</div></div>
      <div class="ik-art">${art}</div>
    </div>`;
  }).join("");

  const tpl = document.createElement("template");
  tpl.innerHTML = `<div class="intro">
    <div class="intro-stage" aria-hidden="true">
      <div class="intro-bg"></div>
      <div class="ik-pre"><div class="old">1.1<i></i></div><p>${tr("intro.pre")}</p></div>
      ${cards}
      <div class="ik-more"><div class="ik-wall">${wall}</div><p><span>${tr("intro.more")}</span></p></div>
      <canvas></canvas>
      <div class="ik-fin"><b>JarvQuant 2.0</b><span>${tr("intro.fin")}</span></div>
      <div class="ik-prog">${scenes.map(() => "<i><b></b></i>").join("")}</div>
    </div>
    <button class="intro-skip" type="button">${tr("intro.skip")}</button>
  </div>`;
  const wrap = tpl.content.firstElementChild;
  const q = (s) => wrap.querySelector(s);

  // ── Ending: on its own, or at once on any input ─────────────────────────
  const timers = [];
  let done = false, leaving = false;
  const at = (ms, fn) => timers.push(setTimeout(() => { if (!done) fn(); }, ms));
  const end = () => {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    unlisten();
    reveal();
    wrap.remove();
  };
  const skip = () => {
    if (done || leaving) return;
    leaving = true;
    root.classList.remove("intro-on");
    wrap.animate({ opacity: [1, 0] }, { duration: 160, fill: "both" }).finished.then(end, end);
  };
  const onKey = (e) => { if (!["Shift", "Control", "Alt", "Meta"].includes(e.key)) skip(); };
  const onHide = () => { if (document.hidden) end(); };
  const unlisten = () => {
    document.removeEventListener("pointerdown", skip, true);
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("keydown", onKey);
    for (const ev of ["wheel", "touchmove", "scroll", "resize", "hashchange"]) window.removeEventListener(ev, skip);
  };
  document.addEventListener("pointerdown", skip, true);
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("keydown", onKey);
  for (const ev of ["wheel", "touchmove", "scroll", "resize", "hashchange"]) window.addEventListener(ev, skip, { passive: true });
  document.body.append(wrap);

  // ── Timeline: every animation is placed on one clock by its delay ───────
  const A = (node, kf, opt) => node.animate(kf, { fill: "both", easing: EASE, ...opt });
  const cut = (node, from, to) => node.animate({ opacity: [0, 1, 1, 0], offset: [0, 0.001, 0.999, 1] }, { duration: to - from, delay: from, fill: "both" });

  wrap.querySelectorAll(".ik-prog b").forEach((b, i) => {
    b.animate({ transform: ["scaleX(0)", "scaleX(1)"] }, { duration: scenes[i][1] - scenes[i][0], delay: scenes[i][0], fill: "both", easing: "linear" });
  });
  A(q(".ik-prog"), { opacity: [1, 0] }, { duration: 160, delay: EXIT });

  // Scene 0: the old version gets struck out.
  cut(q(".ik-pre"), 0, PRE);
  A(q(".ik-pre .old"), { transform: ["scale(1.1)", "none"], opacity: [0, 1] }, { duration: 260 });
  A(q(".ik-pre i"), { transform: ["scaleX(0)", "scaleX(1)"] }, { duration: 150, delay: 420, easing: "cubic-bezier(.7,0,.3,1)" });
  A(q(".ik-pre p"), { opacity: [0, 1], transform: ["translateY(14px)", "none"] }, { duration: 280, delay: 560 });

  // Scenes 1 to 3: one hard cut per feature, the punchline lands a beat later.
  wrap.querySelectorAll(".ik-card").forEach((card, i) => {
    const t = PRE + i * CARD;
    cut(card, t, t + CARD);
    A(card.querySelector(".big"), { transform: ["translateY(14%) scale(1.12)", "none"] }, { duration: 340, delay: t });
    A(card.querySelector(".line"), { clipPath: ["inset(0 100% 0 0)", "inset(0 0 0 0)"] }, { duration: 280, delay: t + 90 });
    A(card.querySelector(".punch"), { opacity: [0, 1], transform: ["translateY(10px)", "none"] }, { duration: 240, delay: t + 620 });
    card.querySelectorAll(".s").forEach((s, k) => A(s, { strokeDashoffset: [1, 0] }, { duration: 320, delay: t + 120 + k * 45 }));
    card.querySelectorAll(".f").forEach((f, k) => A(f, { opacity: [0, 1], transform: ["translateX(18px)", "none"] }, { duration: 260, delay: t + 200 + k * 70 }));
  });

  // Scene 4: everything else in the release, as a wall that scrolls by.
  cut(q(".ik-more"), MORE0, SLAM);
  wrap.querySelectorAll(".ik-wall .col").forEach((col, i) => {
    col.animate({ transform: ["translateY(0)", "translateY(-25%)"] }, { duration: MORE * (1.25 + (i % 2) * 0.45), delay: MORE0, fill: "both", easing: "linear" });
  });
  A(q(".ik-more p"), { opacity: [0, 1], transform: ["scale(1.06)", "none"] }, { duration: 260, delay: MORE0 + 60 });

  // Scene 5: "2.0" slams in, built from candles; around it a dim field of candles.
  const cv = q("canvas"), ctx = cv.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  const COLS = 13, ROWS = 7;
  // The number and its caption sit as one group between the header and the controls at the bottom.
  const fin = q(".ik-fin");
  const TOP = 64, BOTTOM = 84, GAP = 26, finH = fin.offsetHeight;
  const room = H - TOP - BOTTOM - GAP - finH;
  const cw = Math.min((W * 0.92) / COLS, Math.min(H * 0.58, room) / (ROWS * 1.45));
  const ch = cw * 1.45;
  const gx = (W - COLS * cw) / 2, gy = TOP + (room - ROWS * ch) / 2;
  const lit = new Map();
  let col = 0;
  for (const g of ["2", ".", "0"]) {
    const rows = GLYPH[g];
    for (let r = 0; r < ROWS; r++) for (let x = 0; x < rows[0].length; x++) if (rows[r][x] === "1") lit.set(`${col + x},${r}`, g);
    col += rows[0].length + 1;
  }
  const c0 = -Math.ceil(gx / cw), c1 = COLS + Math.ceil(gx / cw);
  const r0 = -Math.ceil(gy / ch), r1 = ROWS + Math.ceil((H - gy - ROWS * ch) / ch);
  const far = Math.hypot(W, H) / 2;
  const cells = [];
  for (let x = c0; x < c1; x++) for (let r = r0; r < r1; r++) {
    const px = gx + (x + 0.5) * cw, py = gy + (r + 0.5) * ch;
    cells.push({ px, py, g: lit.get(`${x},${r}`), h: 0.2 + Math.random() * 0.42, off: (Math.random() - 0.5) * 0.2, ph: Math.random() * 6.28, born: (Math.hypot(px - W / 2, py - H / 2) / far) * 260 });
  }
  const ox = gx + 10.5 * cw, oy = gy + 3.5 * ch; // the hole of the zero: the camera flies through it

  fin.style.top = `${gy + ROWS * ch + GAP}px`;
  A(fin.querySelector("b"), { opacity: [0, 1], transform: ["translateY(10px)", "none"] }, { duration: 320, delay: SLAM + 280 });
  A(fin.querySelector("span"), { opacity: [0, 1], transform: ["translateY(10px)", "none"] }, { duration: 320, delay: SLAM + 700 });
  fin.animate({ opacity: [1, 0] }, { duration: 160, delay: EXIT, fill: "forwards" });
  q(".intro-stage").animate({ transform: ["none", "translate(-7px,4px)", "translate(6px,-5px)", "translate(-3px,2px)", "none"] }, { duration: 190, delay: SLAM + 40 });

  // Exit: the curtain fades while the camera is inside the zero; the page's own entrance starts under it.
  A(q(".intro-bg"), { opacity: [1, 0] }, { duration: 360, delay: EXIT + 280, easing: "linear" });
  A(q(".intro-skip"), { opacity: [1, 0] }, { duration: 160, delay: EXIT });
  at(EXIT + 260, () => root.classList.remove("intro-on"));
  at(END, end);

  const back = (t) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);
  const clock = wrap.animate({ opacity: [1, 1] }, { duration: END + 200 }); // the canvas reads the same clock as the cards
  (function frame() {
    if (done) return;
    requestAnimationFrame(frame);
    const t = (clock.currentTime || 0) - SLAM;
    if (t < 0) return;
    const zk = clamp((t - HOLD) / OUT, 0, 1);
    const z = 1 + 13 * zk * zk * zk;
    const out = 1 - clamp((zk - 0.55) / 0.45, 0, 1);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.translate(ox, oy); ctx.scale(z, z); ctx.translate(-ox, -oy);
    for (const k of cells) {
      const grow = clamp((t - k.born) / 260, 0, 1);
      if (grow <= 0) continue;
      if (k.g) {
        const g = Math.max(0, back(grow));
        const bh = ch * 0.72 * g * (1 + 0.035 * Math.sin(t / 150 + k.ph)), bw = cw * 0.64;
        ctx.globalAlpha = out;
        ctx.fillStyle = ctx.strokeStyle = k.g === "." ? "#e83cf0" : "#33c6e3";
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(k.px, k.py - (ch / 2) * g * 0.96); ctx.lineTo(k.px, k.py + (ch / 2) * g * 0.96); ctx.stroke();
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(k.px - bw / 2, k.py - bh / 2, bw, bh, Math.min(5, bw / 5));
        else ctx.rect(k.px - bw / 2, k.py - bh / 2, bw, bh);
        ctx.fill();
      } else {
        const g = easeOut(grow);
        const bh = ch * k.h * g, bw = cw * 0.5, cy = k.py + k.off * ch;
        ctx.globalAlpha = out * (1 - zk);
        ctx.fillStyle = ctx.strokeStyle = "rgba(232,235,240,0.06)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(k.px, cy - bh * 0.85); ctx.lineTo(k.px, cy + bh * 0.85); ctx.stroke();
        ctx.fillRect(k.px - bw / 2, cy - bh / 2, bw, bh);
      }
    }
    ctx.globalAlpha = 1;
  })();
}

if (root.classList.contains("intro-on")) run().catch(reveal);
