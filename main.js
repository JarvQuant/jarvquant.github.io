import { resolveLang, applyI18n, I18N, setLang } from "./i18n.js";
import { createAmbientEngine } from "./audio.js";
import { createWorld } from "./world.js";
import { revealSequence } from "./textfx.js";

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

(function () {
  // Year
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // i18n
  const lang = resolveLang();
  applyI18n(lang);

  const langSelect = document.getElementById("langSelect");
  if (langSelect) {
    langSelect.value = lang;
    langSelect.addEventListener("change", () => {
      const next = setLang(langSelect.value);
      applyI18n(next);
    });
  }

  // Branding word elements
  const bwMemory = document.getElementById("bwMemory");
  const bwReplay = document.getElementById("bwReplay");
  const bwStructure = document.getElementById("bwStructure");
  const bwEdge = document.getElementById("bwEdge");
  function setWord(el, on) { if (el) el.classList.toggle("is-on", !!on); }

  // Scanline
  const scan = document.createElement("div");
  scan.className = "scanline";
  document.body.appendChild(scan);
  function ritualScan() {
    scan.classList.remove("is-on");
    void scan.offsetWidth;
    scan.classList.add("is-on");
    setTimeout(() => scan.classList.remove("is-on"), 950);
  }

  // HUD
  const hud = document.getElementById("hud");
  const hudTitle = document.getElementById("hudTitle");
  const hudSub = document.getElementById("hudSub");

  // Panel
  const panel = document.getElementById("panel");
  const panelTitle = document.getElementById("panelTitle");
  const panelBody = document.getElementById("panelBody");
  const panelClose = document.getElementById("panelClose");
  function setPanel(data) {
    if (!panel || !panelTitle || !panelBody) return;
    if (!data) {
      panel.classList.remove("is-on");
      panel.setAttribute("aria-hidden", "true");
      return;
    }
    panelTitle.textContent = data.title || "—";
    panelBody.textContent = data.body || "—";
    panel.classList.add("is-on");
    panel.setAttribute("aria-hidden", "false");
  }
  if (panelClose) panelClose.addEventListener("click", () => setPanel(null));

  // Lightbox (image + text mode)
  const imgBox = document.getElementById("imgBox");
  const imgBoxImg = document.getElementById("imgBoxImg");
  const imgBoxTitle = document.getElementById("imgBoxTitle");
  const imgBoxCap = document.getElementById("imgBoxCap");
  const imgBoxClose = document.getElementById("imgBoxClose");
  const imgBoxX = document.getElementById("imgBoxX");

  function isLightboxOpen() {
    return !!imgBox?.classList.contains("is-on");
  }

  function closeImgBox() {
    if (!imgBox) return;
    imgBox.classList.remove("is-on");
    imgBox.setAttribute("aria-hidden", "true");
    if (imgBoxImg) imgBoxImg.style.display = "";
  }

  function openBox({ src = null, title = "—", cap = "" }) {
    if (!imgBox || !imgBoxTitle || !imgBoxCap) return;

    imgBoxTitle.textContent = title;
    imgBoxCap.textContent = cap;

    if (imgBoxImg) {
      if (src) {
        imgBoxImg.src = src;
        imgBoxImg.style.display = "";
      } else {
        imgBoxImg.removeAttribute("src");
        imgBoxImg.style.display = "none";
      }
    }

    imgBox.classList.add("is-on");
    imgBox.setAttribute("aria-hidden", "false");
  }

  if (imgBoxClose) imgBoxClose.addEventListener("click", closeImgBox);
  if (imgBoxX) imgBoxX.addEventListener("click", closeImgBox);

  // Audio
  const audio = createAmbientEngine();
  const muteToggle = document.getElementById("muteToggle");
  function setMutedUI(muted) {
    if (!muteToggle) return;
    muteToggle.setAttribute("aria-pressed", muted ? "true" : "false");
    const dict = I18N[resolveLang()] || I18N.en;
    const label = muted ? (dict["ui.mute"] || "Muted") : (dict["ui.unmute"] || "Audio");
    const t = muteToggle.querySelector(".pill-text");
    if (t) t.textContent = label;
  }
  setMutedUI(true);

  if (muteToggle) {
    muteToggle.addEventListener("click", async () => {
      await audio.ensureRunning();
      const isMuted = await audio.toggleMute();
      setMutedUI(isMuted);
    });
  }

  // World
  const world = createWorld(document.getElementById("world"), {
    onHoverFragment(fragment) {
      if (!hud || !hudTitle || !hudSub) return;
      if (!fragment) {
        hud.classList.remove("is-on");
        hud.setAttribute("aria-hidden", "true");
        return;
      }
      hudTitle.textContent = fragment.title;
      hudSub.textContent = fragment.sub;
      hud.classList.add("is-on");
      hud.setAttribute("aria-hidden", "false");
    },
    onSelectRecord(data) {
      setPanel(data);

      // Exhibits → image lightbox
      if (!data) return;
      const m = (data.title || "").match(/\bEX-\d+\b/);
      if (!m) return;

      const map = {
        "EX-1": { src: "assets/replay.jpg", title: "Replay Engine", cap: "Reconstructed moments suspended in time." },
        "EX-2": { src: "assets/settings.jpg", title: "Assumptions + Presets", cap: "Constraints, validation, and repeatable runs." },
        "EX-3": { src: "assets/journal.jpg", title: "Journal + Export", cap: "Memory fragments turned into evidence." },
        "EX-4": { src: "assets/replay-trader.jpg", title: "Replay Trader", cap: "Execution inside preserved volatility." },
        "EX-5": { src: "assets/strategy-trades.jpg", title: "Strategy → Trades", cap: "From structure to outcomes — preserved." },
        "EX-6": { src: "assets/place-holder-strat.jpg", title: "Strategy Capsule (WIP)", cap: "A placeholder surface for the system layer." },
      };

      const ex = map[m[0]];
      if (ex) openBox(ex);
    }
  });

  // ESC closes overlays
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeImgBox();
      setPanel(null);
      if (world.clearSelection) world.clearSelection();
    }
  });

  // Chapters
  const chapters = Array.from(document.querySelectorAll(".chapter"));
  function getChapterEl(name) {
    return chapters.find((c) => c.getAttribute("data-chapter") === name);
  }

  let active = "threshold";
  async function setActiveChapter(name, { ritual = false } = {}) {
    if (active === name) return;
    active = name;

    chapters.forEach((c) => c.classList.toggle("is-active", c.getAttribute("data-chapter") === name));
    world.setChapter(name);

    const el = getChapterEl(name);
    if (el) await revealSequence(el);

    if (ritual) ritualScan();
  }

  // Continuous rail
  let rail = 0;
  let railTarget = 0;

  function chapterForRail(t) {
    if (t < 0.18) return "threshold";
    if (t < 0.47) return "memory";
    if (t < 0.66) return "replay";
    if (t < 0.88) return "structure";
    return "edge";
  }

  function tickRail() {
    rail += (railTarget - rail) * 0.08;
    world.setRail(rail);

    const ch = chapterForRail(rail);
    setActiveChapter(ch);

    setWord(bwMemory, ch === "memory");
    setWord(bwReplay, ch === "replay");
    setWord(bwStructure, ch === "structure");
    setWord(bwEdge, ch === "edge");

    requestAnimationFrame(tickRail);
  }
  requestAnimationFrame(tickRail);

  let entered = false;

  function onWheel(e) {
    try {
      if (!entered) {
        world.setEntered(true);
        entered = true;
      }

      if (isLightboxOpen()) return;

      const sensitivity = 0.00024;
      const distToMemory = Math.abs(railTarget - 0.32);
      const damping = distToMemory < 0.15 ? 0.55 : 1.0;

      const next = clamp(railTarget + e.deltaY * sensitivity * damping, 0, 1);

      e.preventDefault();
      railTarget = next;
    } catch (err) {
      console.error("wheel handler failed:", err);
    }
  }
  window.addEventListener("wheel", onWheel, { passive: false });

  // Enter starts journey (no jump into memory)
  const enterBtn = document.getElementById("enterBtn");
  if (enterBtn) {
    enterBtn.addEventListener("click", async () => {
      entered = true;
      world.setEntered(true);

      await audio.ensureRunning();
      await audio.setMuted(false);
      setMutedUI(false);

      railTarget = 0.02;
      await setActiveChapter("threshold", { ritual: true });
    });
  }

  // Nav jumps (global, not inside enter handler!)
  const jump = { threshold: 0.00, memory: 0.30, replay: 0.56, structure: 0.78, edge: 1.00 };

  document.querySelectorAll("[data-action='goto']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const target = btn.getAttribute("data-target");
      if (!(target in jump)) return;

      if (!entered && target !== "threshold") {
        world.setEntered(true);
        entered = true;
      }

      railTarget = jump[target];
      await setActiveChapter(target, { ritual: true });
    });
  });

  document.querySelectorAll("[data-action='home']").forEach((a) => {
    a.addEventListener("click", async (e) => {
      e.preventDefault();
      railTarget = 0.00;
      await setActiveChapter("threshold", { ritual: true });
    });
  });

  // Prime audio context (muted)
  window.addEventListener("pointerdown", async () => {
    try { await audio.ensureRunning(); } catch {}
  }, { once: true, passive: true });

  setActiveChapter("threshold");
})();
