// Motion layer for the landing page. No dependencies.
// - ReplayChart: a canvas candle chart that "replays" a synthetic market tick
//   by tick, keeps the future hidden behind a NOW line and runs example trades.
// - Ticker tape, sticky scroll story, tilt showcase, count-ups, reveals.
// Everything degrades to a static frame under prefers-reduced-motion.

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

function gauss() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const fmt = (v, d = 1) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

const COPY = {
  en: { now: "NOW", hidden: "FUTURE HIDDEN", peek: "No peeking.", long: "LONG", short: "SHORT" },
  de: { now: "JETZT", hidden: "ZUKUNFT VERBORGEN", peek: "Nicht schummeln.", long: "LONG", short: "SHORT" },
};
const copy = () => COPY[document.documentElement.lang] || COPY.en;

const C = {
  bull: "#22c39a",
  bear: "#f0616d",
  accent: "#33c6e3",
  grid: "rgba(255,255,255,0.045)",
  text: "rgba(232,235,240,0.9)",
  muted: "rgba(133,142,158,0.9)",
  bg: "#08090c",
};

// ─────────────────────────────────────────────────────────────────────────
class ReplayChart {
  constructor(canvas, opts = {}) {
    this.cv = canvas;
    this.ctx = canvas.getContext("2d");
    this.o = Object.assign(
      { barW: 9, gap: 3, msPerBar: 440, nowFrac: 0.74, trades: true, axis: true, padTop: 0.16, padBot: 0.2, ticks: 9, onStats: null, interactive: true },
      opts
    );
    this.state = { p: 4820, drift: 0.2, vol: 1.5, left: 30 };
    this.bars = [];
    this.n = 1284;
    this.ymin = null;
    this.ymax = null;
    this.pos = null;
    this.cool = 4;
    this.sessionR = 0;
    this.trades = 0;
    this.closed = [];
    this.floats = [];
    this.mouse = null;
    this.running = false;
    this.t = 0;
    this.last = 0;

    for (let i = 0; i < 260; i++) this.bars.push(this._finish(this._newBar()));
    this.form = this._newBar();

    this._resize();
    new ResizeObserver(() => { this._resize(); if (!this.running) this.draw(); }).observe(canvas.parentElement);

    if (this.o.interactive) {
      const host = this.o.pointerHost || canvas.parentElement;
      host.addEventListener("pointermove", (e) => {
        const r = canvas.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        this.mouse = x >= 0 && y >= 0 && x <= r.width && y <= r.height ? { x, y } : null;
        if (!this.running) this.draw();
      });
      host.addEventListener("pointerleave", () => { this.mouse = null; if (!this.running) this.draw(); });
    }

    if (REDUCED) {
      // Fast-forward to an interesting frame, then draw once.
      for (let i = 0; i < 90; i++) this._advance(1);
      this.t = 0.6;
      this.draw();
    }
  }

  _regime() {
    const s = this.state;
    if (--s.left > 0) return;
    s.left = 18 + ((Math.random() * 45) | 0);
    s.drift = [-0.55, -0.25, 0, 0.1, 0.3, 0.6][(Math.random() * 6) | 0];
    s.vol = 1.0 + Math.random() * 1.4;
    // Mean-revert toward the base so the chart never wanders off for ever.
    s.drift += (4820 - s.p) * 0.0009;
  }

  _newBar() {
    this._regime();
    const s = this.state;
    const o = s.p;
    const ticks = [];
    for (let i = 0; i < this.o.ticks; i++) {
      s.p += s.drift * s.vol * 0.35 + gauss() * s.vol;
      ticks.push(s.p);
    }
    return { o, ticks };
  }

  _finish(b) {
    const all = [b.o, ...b.ticks];
    return { o: b.o, h: Math.max(...all), l: Math.min(...all), c: b.ticks[b.ticks.length - 1] };
  }

  _partial(t) {
    const b = this.form;
    const n = b.ticks.length;
    const f = clamp(t, 0, 0.9999) * n;
    const k = Math.floor(f);
    const prev = k === 0 ? b.o : b.ticks[k - 1];
    const c = lerp(prev, b.ticks[k], easeOut(f - k));
    let h = Math.max(b.o, c), l = Math.min(b.o, c);
    for (let i = 0; i < k; i++) { h = Math.max(h, b.ticks[i]); l = Math.min(l, b.ticks[i]); }
    return { o: b.o, h, l, c };
  }

  _atr() {
    const b = this.bars.slice(-14);
    return b.reduce((a, x) => a + (x.h - x.l), 0) / b.length;
  }

  _advance(dt) {
    // dt in bars
    this.t += dt;
    while (this.t >= 1) {
      this.t -= 1;
      const done = this._finish(this.form);
      this._checkPos(done.h, done.l);
      this.bars.push(done);
      if (this.bars.length > 600) this.bars.splice(0, this.bars.length - 600);
      this.n++;
      this.form = this._newBar();
      this._maybeOpen();
    }
    const p = this._partial(this.t);
    this._checkPos(p.h, p.l);
  }

  _maybeOpen() {
    if (!this.o.trades || this.pos) return;
    if (--this.cool > 0 || Math.random() > 0.22) return;
    const bs = this.bars;
    const c = bs[bs.length - 1].c;
    const mom = c - bs[bs.length - 7].c;
    const dir = mom >= 0 ? 1 : -1;
    const risk = this._atr() * 1.25;
    this.pos = { dir, entry: c, sl: c - dir * risk, tp: c + dir * risk * 2, idx: this.n };
    // Nudge the market a little in the trade's favour so it is worth watching.
    if (Math.random() < 0.6) { this.state.drift = dir * (0.35 + Math.random() * 0.35); this.state.left = 14; }
  }

  _checkPos(h, l) {
    const p = this.pos;
    if (!p) return;
    const hitTp = p.dir > 0 ? h >= p.tp : l <= p.tp;
    const hitSl = p.dir > 0 ? l <= p.sl : h >= p.sl;
    if (!hitTp && !hitSl) return;
    const r = hitSl ? -1 : 2;
    const px = hitSl ? p.sl : p.tp;
    this.sessionR += r;
    this.trades++;
    this.closed.push({ ...p, exitIdx: this.n, exit: px, r });
    if (this.closed.length > 6) this.closed.shift();
    this.floats.push({ idx: this.n, price: px, r, born: performance.now() });
    this.pos = null;
    this.cool = 5 + ((Math.random() * 10) | 0);
    this.o.onStats?.(this);
  }

  _resize() {
    const r = this.cv.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = Math.max(1, r.width);
    this.H = Math.max(1, r.height);
    this.cv.width = Math.round(this.W * dpr);
    this.cv.height = Math.round(this.H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.nowFrac = this.W < 700 ? Math.min(this.o.nowFrac + 0.08, 0.84) : this.o.nowFrac;
    this.hatch = null;
  }

  start() {
    if (this.running || REDUCED) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min(now - this.last, 80);
      this.last = now;
      this._advance(dt / this.o.msPerBar);
      this.draw(now);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  _hatch(ctx) {
    if (this.hatch) return this.hatch;
    const p = document.createElement("canvas");
    p.width = p.height = 10;
    const g = p.getContext("2d");
    g.strokeStyle = "rgba(255,255,255,0.05)";
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, 10); g.lineTo(10, 0); g.stroke();
    return (this.hatch = ctx.createPattern(p, "repeat"));
  }

  draw(now = performance.now()) {
    const { ctx, W, H, o } = this;
    const step = o.barW + o.gap;
    const nowX = Math.round(W * this.nowFrac);
    const glide = step * (1 - easeOut(clamp(this.t / 0.22, 0, 1)));
    const form = this._partial(this.t);
    const count = Math.ceil(nowX / step) + 2;
    const vis = this.bars.slice(-count);

    // y range (smoothed)
    let lo = form.l, hi = form.h;
    for (const b of vis) { if (b.l < lo) lo = b.l; if (b.h > hi) hi = b.h; }
    if (this.pos) { lo = Math.min(lo, this.pos.sl, this.pos.tp); hi = Math.max(hi, this.pos.sl, this.pos.tp); }
    if (this.ymin === null) { this.ymin = lo; this.ymax = hi; }
    this.ymin = lerp(this.ymin, lo, 0.06);
    this.ymax = lerp(this.ymax, hi, 0.06);
    const top = H * o.padTop, bot = H * (1 - o.padBot);
    const span = Math.max(this.ymax - this.ymin, 1e-6);
    const Y = (v) => bot - ((v - this.ymin) / span) * (bot - top);
    const X = (j) => nowX - step * (j + 0.5) + glide; // j=0 forming bar, j=1 last closed

    ctx.clearRect(0, 0, W, H);

    // grid
    const raw = span / 5;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const gstep = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
    ctx.lineWidth = 1;
    ctx.strokeStyle = C.grid;
    ctx.fillStyle = C.muted;
    ctx.font = "500 11px 'Geist Mono', ui-monospace, monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let v = Math.ceil(this.ymin / gstep) * gstep; v <= this.ymax; v += gstep) {
      const y = Math.round(Y(v)) + 0.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      if (o.axis) ctx.fillText(fmt(v, gstep < 1 ? 2 : 1), W - 12, y - 8);
    }
    for (let j = 0; j < count; j++) {
      if ((this.n - j + 1) % 16 !== 0) continue;
      const x = Math.round(X(j)) + 0.5;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

    // hidden future
    ctx.fillStyle = this._hatch(ctx);
    ctx.fillRect(nowX, 0, W - nowX, H);
    const fade = ctx.createLinearGradient(nowX, 0, nowX + 120, 0);
    fade.addColorStop(0, "rgba(51,198,227,0.06)");
    fade.addColorStop(1, "rgba(51,198,227,0)");
    ctx.fillStyle = fade;
    ctx.fillRect(nowX, 0, 120, H);

    // open position zones
    if (this.pos) {
      const p = this.pos;
      const x0 = X(this.n - p.idx + 1) - o.barW / 2;
      const yE = Y(p.entry), yT = Y(p.tp), yS = Y(p.sl);
      ctx.fillStyle = "rgba(34,195,154,0.09)";
      ctx.fillRect(x0, Math.min(yE, yT), nowX - x0, Math.abs(yT - yE));
      ctx.fillStyle = "rgba(240,97,109,0.09)";
      ctx.fillRect(x0, Math.min(yE, yS), nowX - x0, Math.abs(yS - yE));
      ctx.setLineDash([4, 4]);
      this._hline(x0, nowX, yT, C.bull);
      this._hline(x0, nowX, yS, C.bear);
      ctx.setLineDash([]);
      this._hline(x0, nowX, yE, "rgba(232,235,240,0.5)");
      this._chip(nowX - 8, yT, `TP ${fmt(p.tp)}`, C.bull, "right");
      this._chip(nowX - 8, yS, `SL ${fmt(p.sl)}`, C.bear, "right");
      this._chip(x0, yE + (p.dir > 0 ? 16 : -16), `${p.dir > 0 ? copy().long : copy().short} ${fmt(p.entry)}`, C.text, "left", true);
    }

    // candles
    const drawBar = (b, x, alpha = 1) => {
      const up = b.c >= b.o;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = ctx.fillStyle = up ? C.bull : C.bear;
      const xm = Math.round(x) + 0.5;
      ctx.beginPath(); ctx.moveTo(xm, Y(b.h)); ctx.lineTo(xm, Y(b.l)); ctx.stroke();
      const y1 = Y(Math.max(b.o, b.c)), y2 = Y(Math.min(b.o, b.c));
      ctx.fillRect(Math.round(x - o.barW / 2), y1, o.barW, Math.max(1, y2 - y1));
      ctx.globalAlpha = 1;
    };
    for (let j = 1; j <= vis.length; j++) {
      const x = X(j);
      if (x < -step) break;
      drawBar(vis[vis.length - j], x);
    }
    drawBar(form, X(0));

    // closed trade markers
    for (const t of this.closed) {
      const xa = X(this.n - t.idx + 1), xb = X(this.n - t.exitIdx);
      if (xb < 0) continue;
      ctx.strokeStyle = t.r > 0 ? "rgba(34,195,154,0.55)" : "rgba(240,97,109,0.55)";
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(xa, Y(t.entry)); ctx.lineTo(xb, Y(t.exit)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = t.r > 0 ? C.bull : C.bear;
      ctx.beginPath(); ctx.arc(xb, Y(t.exit), 3, 0, Math.PI * 2); ctx.fill();
    }

    // current price line + tag
    const yc = Y(form.c);
    ctx.setLineDash([2, 3]);
    this._hline(0, W, yc, "rgba(51,198,227,0.45)");
    ctx.setLineDash([]);
    if (o.axis) this._tag(W - 8, yc, fmt(form.c), C.accent, "#04141a");

    // NOW line
    ctx.strokeStyle = "rgba(51,198,227,0.7)";
    ctx.beginPath(); ctx.moveTo(nowX + 0.5, 0); ctx.lineTo(nowX + 0.5, H); ctx.stroke();
    this._tag(nowX + 1, H * o.padTop - 34, copy().now, C.accent, "#04141a", "center");
    if (W - nowX > 180) {
      ctx.fillStyle = "rgba(133,142,158,0.75)";
      ctx.font = "500 10.5px 'Geist Mono', ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.fillText(copy().hidden, nowX + 40, H * o.padTop - 34);
    }

    // floating results
    this.floats = this.floats.filter((f) => now - f.born < 1800);
    for (const f of this.floats) {
      const a = (now - f.born) / 1800;
      const x = X(this.n - f.idx);
      const y = Y(f.price) - 18 - a * 34;
      ctx.globalAlpha = 1 - a * a;
      this._tag(x, y, `${f.r > 0 ? "+" : ""}${f.r.toFixed(1)}R`, f.r > 0 ? C.bull : C.bear, "#04141a", "center", 13);
      ctx.globalAlpha = 1;
    }

    // crosshair
    const m = this.mouse;
    if (m && o.interactive) {
      if (m.x < nowX) {
        ctx.setLineDash([3, 4]);
        this._hline(0, nowX, m.y, "rgba(232,235,240,0.35)");
        ctx.strokeStyle = "rgba(232,235,240,0.35)";
        ctx.beginPath(); ctx.moveTo(m.x + 0.5, 0); ctx.lineTo(m.x + 0.5, H); ctx.stroke();
        ctx.setLineDash([]);
        const price = this.ymin + ((bot - m.y) / (bot - top)) * span;
        if (o.axis) this._tag(W - 8, m.y, fmt(price), "#262c36", C.text);
      } else {
        this._tag(m.x, m.y - 18, copy().peek, "#151920", C.text, "center");
      }
    }
  }

  _hline(x0, x1, y, color) {
    const { ctx } = this;
    ctx.strokeStyle = color;
    ctx.beginPath(); ctx.moveTo(x0, Math.round(y) + 0.5); ctx.lineTo(x1, Math.round(y) + 0.5); ctx.stroke();
  }

  _chip(x, y, text, color, align = "left", plain = false) {
    const { ctx } = this;
    ctx.font = "500 10.5px 'Geist Mono', ui-monospace, monospace";
    const w = ctx.measureText(text).width + 12;
    const x0 = align === "right" ? x - w : x;
    if (!plain) {
      ctx.fillStyle = "rgba(8,9,12,0.85)";
      ctx.fillRect(x0, y - 9, w, 18);
    }
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x0 + 6, y);
  }

  _tag(x, y, text, bg, fg, align = "right", size = 11) {
    const { ctx } = this;
    ctx.font = `600 ${size}px 'Geist Mono', ui-monospace, monospace`;
    const w = ctx.measureText(text).width + 14;
    const h = size + 9;
    const x0 = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
    ctx.fillStyle = bg;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x0, y - h / 2, w, h, 4); ctx.fill(); }
    else ctx.fillRect(x0, y - h / 2, w, h);
    ctx.fillStyle = fg;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x0 + 7, y + 0.5);
  }
}

// Run a chart only while it is on screen and the tab is visible.
function autoRun(chart, el, extra = () => true) {
  let onScreen = false;
  const sync = () => (onScreen && !document.hidden && extra() ? chart.start() : chart.stop());
  new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; sync(); }, { threshold: 0.05 }).observe(el);
  document.addEventListener("visibilitychange", sync);
  return sync;
}

// ── Hero ────────────────────────────────────────────────────────────────
const heroCanvas = document.getElementById("heroChart");
if (heroCanvas) {
  const hudBar = document.getElementById("hudBar");
  const hudTrades = document.getElementById("hudTrades");
  const hudR = document.getElementById("hudR");
  const hero = new ReplayChart(heroCanvas, {
    pointerHost: document.getElementById("hero"),
    onStats: (c) => {
      hudTrades.textContent = String(c.trades);
      hudR.textContent = `${c.sessionR >= 0 ? "+" : ""}${c.sessionR.toFixed(1)}R`;
      hudR.className = "v " + (c.sessionR > 0 ? "pos" : c.sessionR < 0 ? "neg" : "");
    },
  });
  let lastN = 0;
  setInterval(() => { if (hero.n !== lastN) { lastN = hero.n; hudBar.textContent = hero.n.toLocaleString("en-US"); } }, 250);
  autoRun(hero, document.getElementById("hero"));
}

// ── Headline word animation ─────────────────────────────────────────────
function splitWords(el) {
  if (!el) return;
  const text = el.textContent.trim();
  const words = text.split(/\s+/);
  el.setAttribute("aria-label", text);
  el.innerHTML = words
    .map((w, i) => {
      const cls = i === words.length - 1 ? ' class="accent"' : "";
      const safe = w.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
      return `<span class="w" aria-hidden="true"><span${cls} style="--i:${i}">${safe}</span></span>`;
    })
    .join(" ");
}
const heroTitle = document.getElementById("heroTitle");
splitWords(heroTitle);

// ── Ticker tape ─────────────────────────────────────────────────────────
const MARKETS = [
  { sym: "SYNDEX", cls: "Options", p: 286.13, d: 2 },
  { sym: "VOLATEX", cls: "Crypto", p: 41250.0, d: 1 },
  { sym: "TEMPUS", cls: "Futures", p: 5312.25, d: 2 },
  { sym: "CHRONUS", cls: "CFD", p: 18420.5, d: 1 },
  { sym: "ATLAS", cls: "Spot", p: 112.48, d: 2 },
  { sym: "KAIROS", cls: "Forex", p: 1.0842, d: 4 },
];
const tape = document.getElementById("tape");
if (tape) {
  for (const m of MARKETS) { m.open = m.p * (1 + gauss() * 0.006); }
  const item = (m) => `<div class="tape-item" data-sym="${m.sym}"><span class="sym">${m.sym}</span><span class="cls">${m.cls}</span><span class="px">${fmt(m.p, m.d)}</span><span class="ch"></span></div>`;
  tape.innerHTML = MARKETS.map(item).join("") + MARKETS.map(item).join("");
  tape.querySelectorAll(".tape-item").forEach((el, i) => { if (i >= MARKETS.length) el.setAttribute("aria-hidden", "true"); });
  const paint = (m, dir) => {
    const ch = ((m.p - m.open) / m.open) * 100;
    tape.querySelectorAll(`[data-sym="${m.sym}"]`).forEach((el) => {
      const px = el.querySelector(".px");
      px.textContent = fmt(m.p, m.d);
      const c = el.querySelector(".ch");
      c.textContent = `${ch >= 0 ? "▲" : "▼"} ${Math.abs(ch).toFixed(2)}%`;
      c.className = "ch " + (ch >= 0 ? "up" : "dn");
      if (dir) {
        px.classList.remove("flash-up", "flash-dn");
        void px.offsetWidth;
        px.classList.add(dir > 0 ? "flash-up" : "flash-dn");
        setTimeout(() => px.classList.remove("flash-up", "flash-dn"), 450);
      }
    });
  };
  MARKETS.forEach((m) => paint(m, 0));
  if (!REDUCED) {
    setInterval(() => {
      if (document.hidden) return;
      const m = MARKETS[(Math.random() * MARKETS.length) | 0];
      const prev = m.p;
      m.p *= 1 + gauss() * 0.0011;
      paint(m, Math.sign(m.p - prev));
    }, 420);
  }
}

// ── Count-up ────────────────────────────────────────────────────────────
function countUp(el, dur = 1400) {
  const target = parseFloat(el.dataset.count);
  const dec = el.dataset.dec ? +el.dataset.dec : String(el.dataset.count).includes(".") ? String(el.dataset.count).split(".")[1].length : 0;
  const suf = el.dataset.suffix || "";
  if (REDUCED) { el.textContent = target.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf; return; }
  const t0 = performance.now();
  const tick = (now) => {
    const k = easeOut(clamp((now - t0) / dur, 0, 1));
    el.textContent = (target * k).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ── The loop: sticky scroll story ───────────────────────────────────────
const scenes = [...document.querySelectorAll(".scene")];
const steps = [...document.querySelectorAll(".step")];
const stageName = document.getElementById("stageName");
const stageSteps = document.querySelectorAll("#stageSteps span");
const SCENE_NAMES = ["Replay", "Order ticket", "Trade Autopsy", "Strategy Builder"];
let active = -1;
let miniSync = () => {};

const miniCanvas = document.getElementById("miniChart");
if (miniCanvas) {
  const mini = new ReplayChart(miniCanvas, { barW: 7, gap: 3, msPerBar: 300, nowFrac: 0.7, trades: false, axis: false, padTop: 0.2, padBot: 0.26, interactive: false });
  miniSync = autoRun(mini, document.querySelector(".loop-stage"), () => active === 0);
}

// Equity path for the review scene (deterministic, upward with drawdowns).
(function buildEquity() {
  const line = document.querySelector(".eq .line");
  const area = document.querySelector(".eq .area");
  if (!line) return;
  const rs = [2, -1, -1, 2, 2, -1, 2, -1, -1, -1, 2, 2, -1, 2, -1, 2, 2, -1, -1, 2, -1, 2, 2, -1, 2, -1, -1, 2, 2, -1, 2, 2, -1, 2, -1, 2, 2, -1, 2];
  let eq = 0;
  const pts = [0, ...rs.map((r) => (eq += r * 0.57))];
  const max = Math.max(...pts), min = Math.min(...pts, 0);
  const P = pts.map((v, i) => [(i / (pts.length - 1)) * 396 + 2, 104 - ((v - min) / (max - min || 1)) * 96 + (min < 0 ? 0 : 0)]);
  const d = P.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
  line.setAttribute("d", d);
  area.setAttribute("d", `${d}L398,120L2,120Z`);
})();

function setScene(i) {
  if (i === active) return;
  active = i;
  scenes.forEach((s, k) => {
    s.classList.toggle("on", k === i);
    s.classList.remove("play");
  });
  steps.forEach((s, k) => s.classList.toggle("on", k === i));
  stageSteps.forEach((s, k) => s.classList.toggle("on", k <= i));
  if (stageName) stageName.textContent = SCENE_NAMES[i];
  const s = scenes[i];
  if (s) {
    void s.offsetWidth;
    s.classList.add("play");
    if (i === 2) s.querySelectorAll("[data-count]").forEach((el) => countUp(el, 1600));
  }
  miniSync();
}
if (steps.length) {
  const io = new IntersectionObserver(
    (es) => es.forEach((e) => { if (e.isIntersecting) setScene(+e.target.dataset.step); }),
    // On phones the sticky stage covers the top of the screen, so the active
    // band sits lower, just under it.
    { rootMargin: window.matchMedia("(max-width: 900px)").matches ? "-62% 0px -30% 0px" : "-45% 0px -45% 0px" }
  );
  steps.forEach((s) => io.observe(s));
  setScene(0);
}

// ── Showcase: tilt on scroll + tabs ─────────────────────────────────────
const tilt = document.getElementById("tilt");
const imgs = [...document.querySelectorAll("#shotImgs img")];
const tabs = [...document.querySelectorAll("#tabs .tab")];
const caption = document.getElementById("caption");
const shotTitle = document.getElementById("shotTitle");
let tabIdx = 0, auto = true, autoTimer = 0, showcaseVisible = false;

function showTab(i, fromAuto = false) {
  tabIdx = (i + imgs.length) % imgs.length;
  imgs.forEach((im, k) => im.classList.toggle("on", k === tabIdx));
  tabs.forEach((t, k) => {
    t.classList.toggle("on", k === tabIdx);
    t.setAttribute("aria-selected", String(k === tabIdx));
    t.classList.remove("auto");
  });
  if (caption) caption.textContent = document.getElementById(`cap${tabIdx}`)?.textContent || "";
  if (shotTitle) shotTitle.textContent = `JarvQuant · ${imgs[tabIdx].dataset.title}`;
  clearTimeout(autoTimer);
  if (auto && showcaseVisible && !REDUCED) {
    void tabs[tabIdx].offsetWidth;
    tabs[tabIdx].classList.add("auto");
    autoTimer = setTimeout(() => showTab(tabIdx + 1, true), 6000);
  }
}
tabs.forEach((t) => t.addEventListener("click", () => { auto = false; showTab(+t.dataset.i); }));
if (tilt) {
  new IntersectionObserver((es) => {
    showcaseVisible = es[0].isIntersecting;
    if (showcaseVisible) showTab(tabIdx); else clearTimeout(autoTimer);
  }, { threshold: 0.35 }).observe(tilt);
  showTab(0);
}

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    if (tilt && !REDUCED) {
      const r = tilt.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = clamp((vh - r.top) / (vh * 0.8), 0, 1);
      tilt.style.setProperty("--p", easeOut(p).toFixed(3));
    }
  });
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ── Card spotlight ──────────────────────────────────────────────────────
document.querySelectorAll(".card").forEach((card) => {
  card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
});

// ── Reveals + stat count-ups + breakout ────────────────────────────────
const revealIO = new IntersectionObserver(
  (es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add("in");
    revealIO.unobserve(e.target);
  }),
  { rootMargin: "0px 0px -10% 0px" }
);
document.querySelectorAll("[data-reveal]").forEach((el) => revealIO.observe(el));

const statIO = new IntersectionObserver(
  (es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.querySelectorAll("[data-count]").forEach((el) => countUp(el));
    statIO.unobserve(e.target);
  }),
  { threshold: 0.4 }
);
document.querySelectorAll(".stats").forEach((el) => statIO.observe(el));

(function breakout() {
  const line = document.getElementById("boLine");
  const area = document.getElementById("boArea");
  const final = document.getElementById("final");
  if (!line || !final) return;
  // Range below the level for most of the width, then a breakout that starts
  // to the right of the headline and runs into the top-right corner.
  const pts = [];
  let y = 372;
  const start = 0.76;
  for (let x = 0; x <= 1200; x += 10) {
    const k = x / 1200;
    if (k < start) {
      y += gauss() * 7 + (372 - y) * 0.14;
      y = clamp(y, 346, 404);
    } else {
      const target = lerp(340, 70, easeOut((k - start) / (1 - start)));
      y = lerp(y, target, 0.55) + gauss() * 5;
    }
    pts.push(`${x},${y.toFixed(1)}`);
  }
  const d = "M" + pts.join("L");
  line.setAttribute("d", d);
  area.setAttribute("d", `${d}L1200,420L0,420Z`);
  new IntersectionObserver((es) => { if (es[0].isIntersecting) final.classList.add("in"); }, { threshold: 0.35 }).observe(final);
})();

// Re-split the headline after a language switch (site.js rewrites its text).
document.addEventListener("jq:lang", () => {
  splitWords(heroTitle);
  if (caption) caption.textContent = document.getElementById(`cap${tabIdx}`)?.textContent || "";
});
