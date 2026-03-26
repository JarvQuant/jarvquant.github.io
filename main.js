import { resolveLang, applyI18n, I18N, setLang } from "./i18n.js";
import { createAmbientEngine } from "./audio.js";
import { createWorld } from "./world.js";
import { mountTextFX, revealSequence, glyphScramble } from "./textfx.js";
import { mountBeacons } from "./beacons.js";

(function () {
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

  // Scanline
  const scan = document.createElement("div");
  scan.className = "scanline";
  document.body.appendChild(scan);

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

  // Lightbox
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
  }
  function openImgBox({ src, title, cap }) {
    if (!imgBox || !imgBoxImg || !imgBoxTitle || !imgBoxCap) return;
    imgBoxTitle.textContent = title || "EXHIBIT";
    imgBoxCap.textContent = cap || "";
    imgBoxImg.src = src;
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
      const isMuted = audio.toggleMute();
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
      if (ex) openImgBox(ex);
    }
  });

  mountBeacons(world);
  mountTextFX(document);

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
    if (el) {
      const title = el.querySelector(".chapter-title");
      if (title) glyphScramble(title, { durationMs: 520, intensity: 0.62 });
      await revealSequence(el);
    }

    if (ritual) {
      scan.classList.remove("is-on");
      void scan.offsetWidth;
      scan.classList.add("is-on");
      setTimeout(() => scan.classList.remove("is-on"), 950);
    }
  }

  // Continuous rail
  let rail = 0;
  let railTarget = 0;

  // ranges decide chapter automatically
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

    // auto chapter selection
    const ch = chapterForRail(rail);
    setActiveChapter(ch);

    requestAnimationFrame(tickRail);
  }
  requestAnimationFrame(tickRail);

  let entered = false;

  function onWheel(e) {
    e.preventDefault();

    if (!entered) {
      world.setEntered(true);
      entered = true;
    }

    if (isLightboxOpen()) return;

    // sensitivity (lower = slower movement)
    // trackpads often send small deltas; wheel sends bigger jumps.
    const sensitivity = 0.00028;

    // "gallery damping": slow down around memory area so you can inspect exhibits
    // memory center approx t ~ 0.32
    const distToMemory = Math.abs(railTarget - 0.32);
    const damping = distToMemory < 0.10 ? 0.55 : 1.0;

    railTarget = clamp(railTarget + e.deltaY * sensitivity * damping, 0, 1);
  }

  window.addEventListener("wheel", onWheel, { passive: false });

  // Buttons
  const enterBtn = document.getElementById("enterBtn");
  const peekBtn = document.getElementById("peekBtn");

  if (peekBtn) {
    peekBtn.addEventListener("click", async () => {
      entered = true;
      world.setEntered(true);
      railTarget = 0.30;               // land near gallery
      await setActiveChapter("memory", { ritual: true });
    });
  }

  if (enterBtn) {
    enterBtn.addEventListener("click", async () => {
      entered = true;
      world.setEntered(true);

      await audio.ensureRunning();
      audio.setMuted(false);
      setMutedUI(false);

      railTarget = 0.30;
      await setActiveChapter("memory", { ritual: true });
    });
  }

  // Nav jumps (still allowed)
  const jump = {
    threshold: 0.00,
    memory: 0.30,
    replay: 0.56,
    structure: 0.78,
    edge: 1.00
  };

  document.querySelectorAll("[data-action='goto']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const target = btn.getAttribute("data-target");
      if (!jump.hasOwnProperty(target)) return;

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

  window.addEventListener("pointerdown", async () => {
    try { await audio.ensureRunning(); } catch {}
  }, { once: true, passive: true });

  setActiveChapter("threshold");
})();
