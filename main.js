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

  // Scanline
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

  mountTextFX(document);

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

  // --- Locked scroll rail ---
  // rail 0..1 drives camera through the lattice
  let rail = 0;
  let railTarget = 0;

  const stops = [
    { name: "threshold", t: 0.00 },
    { name: "memory", t: 0.32 },
    { name: "replay", t: 0.55 },
    { name: "structure", t: 0.77 },
    { name: "edge", t: 1.00 },
  ];

  function nearestStop(t) {
    let best = stops[0];
    let bestD = Infinity;
    for (const s of stops) {
      const d = Math.abs(s.t - t);
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  function syncChapterToRail(t) {
    const s = nearestStop(t);
    if (s.name !== active) setActiveChapter(s.name);
  }

  // Smoothly update rail towards target
  function tick() {
    rail += (railTarget - rail) * 0.08;
    world.setRail(rail);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // Wheel handler (cinematic)
  let entered = false;
  let wheelAcc = 0;
  let wheelLock = false;

  function bump(dir) {
    // dir: +1 forward, -1 backward
    const cur = nearestStop(railTarget);
    const idx = stops.findIndex(s => s.name === cur.name);
    const next = stops[Math.max(0, Math.min(stops.length - 1, idx + dir))];
    railTarget = next.t;
    syncChapterToRail(railTarget);
  }

  function onWheel(e) {
    // Prevent page scrolling – we’re “moving through space”
    e.preventDefault();

    if (!entered) {
      // allow a “peek” movement without audio
      world.setEntered(true);
      entered = true;
    }

    wheelAcc += e.deltaY;

    if (wheelLock) return;

    // threshold so trackpads don’t spam
    if (Math.abs(wheelAcc) > 120) {
      wheelLock = true;
      bump(wheelAcc > 0 ? +1 : -1);
      wheelAcc = 0;

      // lock briefly to preserve cinematic steps
      setTimeout(() => { wheelLock = false; }, 550);
    }
  }

  window.addEventListener("wheel", onWheel, { passive: false });

  // Enter ritual
  const enterBtn = document.getElementById("enterBtn");
  if (enterBtn) {
    enterBtn.addEventListener("click", async () => {
      entered = true;
      world.setEntered(true);

      await audio.ensureRunning();
      audio.setMuted(false);
      setMutedUI(false);

      // Jump to memory stop with ritual
      railTarget = 0.32;
      await setActiveChapter("memory", { ritual: true });
    });
  }

  // Nav buttons jump stops
  document.querySelectorAll("[data-action='goto']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const target = btn.getAttribute("data-target");
      const s = stops.find(x => x.name === target);
      if (!s) return;

      if (!entered && target !== "threshold") {
        world.setEntered(true);
        entered = true;
      }

      railTarget = s.t;
      await setActiveChapter(target);
    });
  });

  document.querySelectorAll("[data-action='home']").forEach((a) => {
    a.addEventListener("click", async (e) => {
      e.preventDefault();
      railTarget = 0.00;
      await setActiveChapter("threshold");
    });
  });

  // Prime audio context (muted) on first interaction
  window.addEventListener("pointerdown", async () => {
    try { await audio.ensureRunning(); } catch {}
  }, { once: true, passive: true });

  // Init
  setActiveChapter("threshold");
})();
