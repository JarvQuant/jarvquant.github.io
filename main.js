import { resolveLang, applyI18n, I18N } from "./i18n.js";
import { createAmbientEngine } from "./audio.js";
import { createWorld } from "./world.js";
import { mountTextFX, revealSequence, glyphScramble } from "./textfx.js";

(function () {
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // i18n
  const lang = resolveLang();
  applyI18n(lang);

  // Scanline element (ritual)
  const scan = document.createElement("div");
  scan.className = "scanline";
  document.body.appendChild(scan);

  // HUD
  const hud = document.getElementById("hud");
  const hudTitle = document.getElementById("hudTitle");
  const hudSub = document.getElementById("hudSub");

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
    }
  });

  // Text FX (subtle)
  const unmountFX = mountTextFX(document);

  // Chapters
  const chapters = Array.from(document.querySelectorAll(".chapter"));
  function getChapterEl(name) {
    return chapters.find((c) => c.getAttribute("data-chapter") === name);
  }

  let active = "threshold";
  async function setActiveChapter(name, { ritual = false } = {}) {
    active = name;
    chapters.forEach((c) => c.classList.toggle("is-active", c.getAttribute("data-chapter") === name));
    world.setChapter(name);

    const el = getChapterEl(name);
    if (el) {
      // Scramble title slightly (Giulio-like, but controlled)
      const title = el.querySelector(".chapter-title");
      if (title) glyphScramble(title, { durationMs: 520, intensity: 0.65 });

      // Reveal sequence
      await revealSequence(el);
    }

    if (ritual) {
      scan.classList.remove("is-on");
      // restart animation
      void scan.offsetWidth;
      scan.classList.add("is-on");
      setTimeout(() => scan.classList.remove("is-on"), 950);
    }
  }

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

  async function enterRitual() {
    // enable hover + “earned” interaction
    world.setEntered(true);

    // audio starts after explicit action
    await audio.ensureRunning();
    audio.setMuted(false);
    setMutedUI(false);

    await setActiveChapter("memory", { ritual: true });
  }

  // Enter
  let entered = false;
  const enterBtn = document.getElementById("enterBtn");
  if (enterBtn) {
    enterBtn.addEventListener("click", async () => {
      entered = true;
      await enterRitual();
    });
  }

  // Nav
  document.querySelectorAll("[data-action='goto']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const target = btn.getAttribute("data-target");
      if (!target) return;

      // allow “peek” without full ritual
      if (!entered && target !== "threshold") {
        world.setEntered(true);
      }
      await setActiveChapter(target, { ritual: false });
    });
  });

  // Home
  document.querySelectorAll("[data-action='home']").forEach((a) => {
    a.addEventListener("click", async (e) => {
      e.preventDefault();
      await setActiveChapter("threshold");
    });
  });

  // Prime audio context (still muted) on first interaction anywhere
  window.addEventListener("pointerdown", async () => {
    try { await audio.ensureRunning(); } catch {}
  }, { once: true, passive: true });

  // Init
  setActiveChapter("threshold");
})();
