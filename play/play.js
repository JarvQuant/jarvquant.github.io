// Daily Chart Challenge: five real NAS100 charts a day. The player calls long or
// short, then the hidden bars play out. Rounds are static JSON built by
// tools/build_daily.py; progress and the streak stay in this browser only.

const EPOCH = Date.UTC(2026, 9, 22); // the local date that is Daily #1
const POOL = 365; // number of files in days/
const ROUNDS = 5;
const KEY = "jq_play";
const BEACON = "https://jarvquant-api.onrender.com/v";
const SITE_URL = "https://www.jarvquant.com/?ref=play";
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const MOBILE = matchMedia("(pointer: coarse)").matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const T = {
  en: {
    eyebrow: "Daily chart challenge",
    title: "Long or short?",
    sub: "Five real NAS100 charts a day. Call the next move, then watch what really happened.",
    fine: "Free · no sign-up · new charts every day at midnight",
    start: "Start Daily #{n}",
    resume: "Continue Daily #{n}",
    loadErr: "Couldn't load the charts. Check your connection.",
    retry: "Try again",
    round: "Daily #{n} · {i}/5",
    practice: "Practice · {ok}/{all} right",
    back: "Results",
    long: "Long",
    short: "Short",
    hidden: "FUTURE HIDDEN",
    now: "NOW",
    right: "Right call.",
    wrong: "Missed.",
    went: "It went {move} in the next {bars} bars.",
    next: "Next chart",
    finish: "See result",
    t5: "Perfect read.",
    t4: "Strong read.",
    t3: "Better than a coin flip.",
    t2: "The market won today.",
    t1: "Tough day. New charts tomorrow.",
    streak: "{n}-day streak · best {b}",
    streak1: "1-day streak · best {b}",
    share: "Share result",
    copied: "Copied ✓",
    more: "Practise more",
    nextIn: "Next challenge in",
    install: "Add to home screen",
    ios: "Tip: tap Share, then “Add to Home Screen”, and the challenge opens like an app.",
    ctaTitle: "Train this on 9 years of data",
    ctaBody: "JarvQuant replays real markets bar by bar on your PC and shows you after every session what costs you money. Free plan, no card.",
    ctaDownload: "Download for Windows",
    ctaSend: "Send the link to my PC",
    ctaWhat: "What is JarvQuant?",
    foot: "Real historical NAS100 data. A practice game, not financial advice.",
    shareText: "JarvQuant Daily #{n} · {s}/5\n{grid}\nLong or short? Try today's charts:",
    sendText: "JarvQuant, the trading simulator for Windows:",
  },
  de: {
    eyebrow: "Tägliche Chart-Challenge",
    title: "Long oder Short?",
    sub: "Fünf echte NAS100-Charts am Tag. Tipp auf die nächste Bewegung und sieh, was wirklich passiert ist.",
    fine: "Gratis · ohne Anmeldung · jeden Tag um Mitternacht neue Charts",
    start: "Daily #{n} starten",
    resume: "Daily #{n} fortsetzen",
    loadErr: "Die Charts konnten nicht geladen werden. Prüf deine Verbindung.",
    retry: "Nochmal versuchen",
    round: "Daily #{n} · {i}/5",
    practice: "Training · {ok}/{all} richtig",
    back: "Ergebnis",
    long: "Long",
    short: "Short",
    hidden: "ZUKUNFT VERBORGEN",
    now: "JETZT",
    right: "Richtig gelesen.",
    wrong: "Daneben.",
    went: "Es ging {move} in den nächsten {bars} Kerzen.",
    next: "Nächster Chart",
    finish: "Ergebnis ansehen",
    t5: "Perfekt gelesen.",
    t4: "Starke Runde.",
    t3: "Besser als ein Münzwurf.",
    t2: "Heute hat der Markt gewonnen.",
    t1: "Harter Tag. Morgen gibt's neue Charts.",
    streak: "{n} Tage in Folge · Rekord {b}",
    streak1: "1 Tag in Folge · Rekord {b}",
    share: "Ergebnis teilen",
    copied: "Kopiert ✓",
    more: "Weiter üben",
    nextIn: "Nächste Challenge in",
    install: "Zum Homescreen hinzufügen",
    ios: "Tipp: Tippe auf Teilen und dann auf „Zum Home-Bildschirm“, dann öffnet sich die Challenge wie eine App.",
    ctaTitle: "Trainier das mit 9 Jahren Daten",
    ctaBody: "JarvQuant spielt echte Märkte Kerze für Kerze auf deinem PC ab und zeigt dir nach jeder Session, was dich Geld kostet. Gratis-Plan, keine Karte.",
    ctaDownload: "Für Windows herunterladen",
    ctaSend: "Link an meinen PC schicken",
    ctaWhat: "Was ist JarvQuant?",
    foot: "Echte historische NAS100-Daten. Ein Übungsspiel, keine Finanzberatung.",
    shareText: "JarvQuant Daily #{n} · {s}/5\n{grid}\nLong oder Short? Probier die Charts von heute:",
    sendText: "JarvQuant, der Trading-Simulator für Windows:",
  },
};

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ── Language ────────────────────────────────────────────────────────────
function pickLang() {
  const q = new URLSearchParams(location.search).get("lang");
  if (q && T[q]) return q;
  try {
    const s = localStorage.getItem("jq_lang");
    if (s && T[s]) return s;
  } catch (e) {}
  return (navigator.language || "").toLowerCase().startsWith("de") ? "de" : "en";
}
let lang = pickLang();
const t = (k, vars = {}) => (T[lang][k] ?? T.en[k]).replace(/\{(\w+)\}/g, (_, v) => vars[v]);

// ── Progress (this browser only) ────────────────────────────────────────
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (s && s.v === 1) return s;
  } catch (e) {}
  return { v: 1, last: 0, streak: 0, best: 0, res: {}, cur: null };
}
const state = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}

function todayNumber() {
  const d = new Date();
  return Math.max(1, Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 864e5) + 1);
}
const TODAY = todayNumber();
const liveStreak = () => (state.last >= TODAY - 1 ? state.streak : 0);

function beacon(path) {
  try {
    const body = JSON.stringify({ path, ref: "" });
    if (navigator.sendBeacon) navigator.sendBeacon(BEACON, body);
  } catch (e) {}
}

// ── Rounds ──────────────────────────────────────────────────────────────
async function fetchDay(num) {
  const f = String((((num - 1) % POOL) + POOL) % POOL).padStart(3, "0");
  const res = await fetch(`days/${f}.json`);
  if (!res.ok) throw new Error(res.status);
  return (await res.json()).r.map(decode);
}

function decode(r) {
  const k = r.k, div = 10 ** r.p, bars = [];
  for (let i = 0; i < k.length; i += 4) {
    bars.push({ o: (r.b + k[i]) / div, h: (r.b + k[i + 1]) / div, l: (r.b + k[i + 2]) / div, c: (r.b + k[i + 3]) / div });
  }
  const entry = bars[r.n - 1].c, exit = bars[bars.length - 1].c;
  return { sym: r.s, tf: r.tf, date: r.d.slice(0, 10), n: r.n, p: r.p, bars, entry, exit, up: exit > entry };
}

// ── Chart ───────────────────────────────────────────────────────────────
const C = {
  bull: "#22c39a", bear: "#f0616d", accent: "#33c6e3", ink: "#04141a",
  grid: "rgba(255,255,255,0.05)", muted: "rgba(133,142,158,0.9)", hatch: "rgba(255,255,255,0.035)",
};

class Chart {
  constructor(cv) {
    this.cv = cv;
    this.ctx = cv.getContext("2d");
    this.r = null;
    new ResizeObserver(() => this.resize()).observe(cv);
  }
  resize() {
    const box = this.cv.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = box.width;
    this.H = box.height;
    this.cv.width = Math.round(box.width * dpr);
    this.cv.height = Math.round(box.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.r) this.range = this.rangeFor(this.shown);
    this.draw();
  }
  set(r) {
    this.r = r;
    this.shown = r.n;
    this.done = false;
    this.range = this.rangeFor(r.n);
    this.draw();
  }
  // Phones show the last 30 context bars so candles stay readable.
  first() {
    return this.W && this.W < 480 ? Math.max(0, this.r.n - 30) : 0;
  }
  rangeFor(count) {
    let lo = Infinity, hi = -Infinity;
    for (let i = this.first(); i < count; i++) {
      lo = Math.min(lo, this.r.bars[i].l);
      hi = Math.max(hi, this.r.bars[i].h);
    }
    const pad = (hi - lo) * 0.12 || 1;
    return [lo - pad, hi + pad];
  }
  async reveal() {
    const r = this.r, total = r.bars.length, from = this.range, to = this.rangeFor(total);
    const steps = total - r.n;
    for (let s = 1; s <= steps; s++) {
      const k = REDUCED ? 1 : s / steps;
      this.range = [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k];
      this.shown = REDUCED ? total : r.n + s;
      this.draw();
      if (REDUCED) break;
      await sleep(65);
    }
    this.done = true;
    this.draw();
  }
  draw() {
    const { ctx, W, H, r } = this;
    if (!r || !W) return;
    ctx.clearRect(0, 0, W, H);
    const from = this.first();
    const total = r.bars.length - from;
    const x0 = 10, x1 = W - 62, y0 = 34, y1 = H - 14;
    const slot = (x1 - x0) / total;
    const [lo, hi] = this.range;
    const y = (p) => y1 - ((p - lo) / (hi - lo)) * (y1 - y0);
    const fmt = (p) => p.toLocaleString("en-US", { minimumFractionDigits: r.p, maximumFractionDigits: r.p });
    const xNow = x0 + (r.n - from) * slot;

    // Grid and price axis
    ctx.font = "10px 'Geist Mono', ui-monospace, monospace";
    ctx.textBaseline = "middle";
    for (let g = 0; g <= 4; g++) {
      const p = lo + ((hi - lo) * (g + 0.5)) / 5;
      const gy = y(p);
      ctx.fillStyle = C.grid;
      ctx.fillRect(x0, Math.round(gy), x1 - x0, 1);
      ctx.fillStyle = C.muted;
      ctx.textAlign = "left";
      ctx.fillText(fmt(p), x1 + 8, gy);
    }

    // Hidden future
    if (!this.done) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(xNow, 0, W - xNow, H);
      ctx.clip();
      ctx.strokeStyle = C.hatch;
      ctx.lineWidth = 6;
      for (let hx = xNow - H; hx < W; hx += 14) {
        ctx.beginPath();
        ctx.moveTo(hx, H);
        ctx.lineTo(hx + H, 0);
        ctx.stroke();
      }
      ctx.restore();
      if (this.shown === r.n) {
        ctx.save();
        ctx.translate((xNow + x1) / 2, (y0 + y1) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = C.muted;
        ctx.textAlign = "center";
        ctx.fillText(t("hidden"), 0, 0);
        ctx.restore();
      }
    }

    // Result band between entry and exit
    if (this.done) {
      const ye = y(r.entry), yx = y(r.exit);
      ctx.fillStyle = r.up ? "rgba(34,195,154,0.10)" : "rgba(240,97,109,0.10)";
      ctx.fillRect(xNow, Math.min(ye, yx), x1 - xNow, Math.abs(yx - ye));
    }

    // Candles
    const bw = Math.max(1, Math.floor(slot * 0.66));
    for (let i = from; i < this.shown; i++) {
      const b = r.bars[i];
      const cx = Math.round(x0 + (i - from) * slot + slot / 2);
      ctx.fillStyle = b.c >= b.o ? C.bull : C.bear;
      ctx.fillRect(cx, Math.round(y(b.h)), 1, Math.max(1, Math.round(y(b.l) - y(b.h))));
      const top = y(Math.max(b.o, b.c)), bot = y(Math.min(b.o, b.c));
      ctx.fillRect(Math.round(cx - bw / 2 + 0.5), Math.round(top), bw, Math.max(1, Math.round(bot - top)));
    }

    // Entry line, NOW line and tags
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(51,198,227,0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, Math.round(y(r.entry)) + 0.5);
    ctx.lineTo(x1, Math.round(y(r.entry)) + 0.5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(51,198,227,0.55)";
    ctx.fillRect(Math.round(xNow), y0 - 8, 1, y1 - y0 + 8);
    this.tag(x1 + 2, y(r.entry), fmt(r.entry), C.accent, C.ink);
    this.tag(xNow, y0 - 18, t("now"), C.accent, C.ink, true);
    if (this.done) {
      const col = r.up ? C.bull : C.bear;
      this.tag(x1 + 2, y(r.exit), fmt(r.exit), col, "#08090c");
      const last = r.bars[total - 1];
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x0 + (total - 0.5) * slot, y(last.c), 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  tag(x, yy, text, bg, fg, center = false) {
    const { ctx } = this;
    ctx.font = "600 10px 'Geist Mono', ui-monospace, monospace";
    const w = ctx.measureText(text).width + 10, h = 16;
    const left = center ? x - w / 2 : x;
    ctx.fillStyle = bg;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(left, yy - h / 2, w, h, 3);
    else ctx.rect(left, yy - h / 2, w, h);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, left + 5, yy + 0.5);
  }
}

// ── Game ────────────────────────────────────────────────────────────────
const chart = new Chart($("chart"));
let mode = "daily";
let rounds = [];
let idx = 0;
let busy = false;
let practice = { queue: [], ok: 0, all: 0 };
let lastVerdict = null;

function show(id) {
  for (const s of ["intro", "game", "done"]) $(s).hidden = s !== id;
  if (id === "game") chart.resize();
  window.scrollTo(0, 0);
}

function answers() {
  return state.cur && state.cur.day === TODAY ? state.cur.ans : [];
}

function renderHud() {
  const dots = $("dots");
  dots.innerHTML = "";
  if (mode === "daily") {
    $("hudLabel").textContent = t("round", { n: TODAY, i: Math.min(idx + 1, ROUNDS) });
    const ans = answers();
    for (let i = 0; i < ROUNDS; i++) {
      const d = document.createElement("i");
      d.className = i < ans.length ? (ans[i] ? "ok" : "no") : i === idx ? "cur" : "";
      dots.appendChild(d);
    }
  } else {
    $("hudLabel").textContent = t("practice", { ok: practice.ok, all: practice.all });
  }
  $("toResults").hidden = mode !== "practice";
  const r = rounds[idx];
  if (r) $("meta").textContent = `${r.sym} · ${r.tf}`;
}

function renderVerdict() {
  const v = $("verdict");
  if (!lastVerdict) {
    v.className = "verdict";
    v.textContent = "";
    return;
  }
  const { ok, r } = lastVerdict;
  const move = new Intl.NumberFormat(lang, { style: "percent", signDisplay: "always", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(r.exit / r.entry - 1);
  v.className = "verdict " + (ok ? "ok" : "no");
  v.innerHTML = "";
  const b = document.createElement("b");
  b.textContent = t(ok ? "right" : "wrong");
  const when = document.createElement("span");
  when.className = "when";
  when.textContent = " " + new Date(r.date + "T12:00:00").toLocaleDateString(lang, { day: "numeric", month: "short", year: "numeric" });
  v.append(b, t("went", { move, bars: r.bars.length - r.n }), when);
}

function startRound() {
  lastVerdict = null;
  chart.set(rounds[idx]);
  renderHud();
  renderVerdict();
  $("pickRow").hidden = false;
  $("nextRow").hidden = true;
  $("longBtn").disabled = $("shortBtn").disabled = false;
  busy = false;
}

async function pick(long) {
  if (busy || $("pickRow").hidden) return;
  busy = true;
  $("longBtn").disabled = $("shortBtn").disabled = true;
  const r = rounds[idx];
  const ok = long === r.up;
  if (mode === "daily") {
    // Saved before the reveal, so a reload can't change the answer.
    if (!state.cur || state.cur.day !== TODAY) state.cur = { day: TODAY, ans: [] };
    state.cur.ans[idx] = ok ? 1 : 0;
    save();
  } else {
    practice.all += 1;
    practice.ok += ok ? 1 : 0;
  }
  await chart.reveal();
  if (navigator.vibrate) navigator.vibrate(ok ? 18 : [30, 40, 30]);
  lastVerdict = { ok, r };
  renderHud();
  renderVerdict();
  $("pickRow").hidden = true;
  $("nextRow").hidden = false;
  $("nextBtn").textContent = mode === "daily" && idx === ROUNDS - 1 ? t("finish") : t("next");
  $("nextBtn").focus({ preventScroll: true });
  busy = false;
}

async function next() {
  if (busy) return;
  if (mode === "daily") {
    if (idx >= ROUNDS - 1) return finish();
    idx += 1;
    return startRound();
  }
  idx += 1;
  if (idx >= rounds.length) {
    busy = true;
    try {
      await morePractice();
    } catch (e) {
      busy = false;
      return;
    }
  }
  startRound();
}

async function startDaily() {
  $("loadErr").hidden = true;
  $("startBtn").disabled = true;
  try {
    rounds = await fetchDay(TODAY);
  } catch (e) {
    $("loadErr").hidden = false;
    $("startBtn").disabled = false;
    return;
  }
  $("startBtn").disabled = false;
  mode = "daily";
  idx = answers().length;
  if (idx >= ROUNDS) return finish();
  show("game");
  startRound();
}

async function morePractice() {
  let day;
  do day = 1 + Math.floor(Math.random() * POOL);
  while (((day - 1) % POOL) === ((TODAY - 1) % POOL));
  const fresh = await fetchDay(day);
  fresh.sort(() => Math.random() - 0.5);
  rounds = rounds.slice(idx).concat(fresh);
  idx = 0;
}

async function startPractice() {
  mode = "practice";
  rounds = [];
  idx = 0;
  try {
    await morePractice();
  } catch (e) {
    return;
  }
  show("game");
  startRound();
}

function finish() {
  const ans = answers();
  if (!state.res[TODAY]) {
    state.res[TODAY] = ans.slice(0, ROUNDS);
    state.streak = state.last === TODAY - 1 ? state.streak + 1 : 1;
    state.best = Math.max(state.best, state.streak);
    state.last = TODAY;
    state.cur = null;
    for (const k of Object.keys(state.res)) if (+k < TODAY - 60) delete state.res[k];
    save();
    beacon("/play/done");
  }
  renderDone();
  show("done");
}

// ── Result screen ───────────────────────────────────────────────────────
const gridOf = (res) => res.map((x) => (x ? "🟩" : "🟥")).join("");

function renderDone() {
  const res = state.res[TODAY] || [];
  const s = res.reduce((a, b) => a + b, 0);
  $("doneLabel").textContent = `Daily #${TODAY}`;
  $("scoreN").textContent = s;
  $("grid").textContent = gridOf(res);
  $("doneTitle").textContent = t(s >= 5 ? "t5" : s === 4 ? "t4" : s === 3 ? "t3" : s === 2 ? "t2" : "t1");
  $("streakLine").textContent = t(liveStreak() === 1 ? "streak1" : "streak", { n: liveStreak(), b: state.best });
  $("shareBtn").textContent = t("share");
  const cta = $("ctaMain");
  if (MOBILE) {
    cta.textContent = t("ctaSend");
    cta.href = SITE_URL;
  } else {
    cta.textContent = t("ctaDownload");
  }
  renderStreak();
}

async function share() {
  const res = state.res[TODAY] || [];
  const text = t("shareText", { n: TODAY, s: res.reduce((a, b) => a + b, 0), grid: gridOf(res) });
  const url = "https://www.jarvquant.com/play/";
  if (navigator.share && MOBILE) {
    try {
      await navigator.share({ text, url });
    } catch (e) {}
    return;
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    $("shareBtn").textContent = t("copied");
    setTimeout(() => ($("shareBtn").textContent = t("share")), 1600);
  } catch (e) {}
}

async function sendLink(e) {
  if (!MOBILE) return; // desktop keeps the plain download link
  e.preventDefault();
  if (navigator.share) {
    try {
      await navigator.share({ text: t("sendText"), url: SITE_URL });
    } catch (err) {}
  } else {
    location.href = SITE_URL;
  }
}

function tickCountdown() {
  const now = new Date();
  const mid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const s = Math.max(0, Math.floor((mid - now) / 1000));
  if (s === 0 && !$("done").hidden) return location.reload();
  const p = (v) => String(v).padStart(2, "0");
  $("countdown").textContent = `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

// ── Install ─────────────────────────────────────────────────────────────
let installEvt = null;
const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installEvt = e;
  $("installBtn").hidden = false;
});
$("installBtn").addEventListener("click", async () => {
  if (!installEvt) return;
  installEvt.prompt();
  await installEvt.userChoice.catch(() => null);
  installEvt = null;
  $("installBtn").hidden = true;
});
if (!standalone && /iPhone|iPad|iPod/i.test(navigator.userAgent)) $("iosHint").hidden = false;
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

// ── Static text, header ─────────────────────────────────────────────────
function renderStreak() {
  const n = liveStreak();
  $("streak").hidden = n < 1;
  $("streakN").textContent = n;
}

function renderIntro() {
  $("startBtn").textContent = t(answers().length ? "resume" : "start", { n: TODAY });
}

function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-t]").forEach((el) => (el.textContent = t(el.dataset.t)));
  $("langBtn").textContent = lang === "en" ? "DE" : "EN";
  renderIntro();
  if (!$("done").hidden) renderDone();
  if (!$("game").hidden) {
    renderHud();
    renderVerdict();
    chart.draw();
    $("nextBtn").textContent = mode === "daily" && idx === ROUNDS - 1 ? t("finish") : t("next");
  }
}

$("langBtn").addEventListener("click", () => {
  lang = lang === "en" ? "de" : "en";
  try { localStorage.setItem("jq_lang", lang); } catch (e) {}
  applyLang();
});
$("startBtn").addEventListener("click", startDaily);
$("retryBtn").addEventListener("click", startDaily);
$("longBtn").addEventListener("click", () => pick(true));
$("shortBtn").addEventListener("click", () => pick(false));
$("nextBtn").addEventListener("click", next);
$("shareBtn").addEventListener("click", share);
$("practiceBtn").addEventListener("click", startPractice);
$("toResults").addEventListener("click", () => {
  mode = "daily";
  if (state.res[TODAY]) {
    renderDone();
    show("done");
  } else {
    renderIntro();
    show("intro");
  }
});
$("ctaMain").addEventListener("click", sendLink);
addEventListener("keydown", (e) => {
  if ($("game").hidden || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (!$("pickRow").hidden && (k === "arrowup" || k === "l")) pick(true);
  else if (!$("pickRow").hidden && (k === "arrowdown" || k === "s")) pick(false);
  else if (!$("nextRow").hidden && (k === "enter" || k === " ") && document.activeElement !== $("nextBtn")) next();
});

applyLang();
renderStreak();
tickCountdown();
setInterval(tickCountdown, 1000);
if (state.res[TODAY]) {
  renderDone();
  show("done");
}
