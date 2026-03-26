import { resolveLang, applyI18n, I18N } from "./i18n.js";
import { createAmbientEngine } from "./audio.js";
import { createWorld } from "./world.js";

(function () {
  // Year
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // i18n
  const lang = resolveLang();
  applyI18n(lang);

  // World
  const hud = document.getElementById("hud");
  const hudTitle = document.getElementById("hudTitle");
  const hudSub = document.getElementById("hudSub");

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

  // Chapters
  const chapters = Array.from(document.querySelectorAll(".chapter"));
  function setActiveChapter(name) {
    chapters.forEach((c) => c.classList.toggle("is-active", c.getAttribute("data-chapter") === name));
    world.setChapter(name);
  }

  // Audio engine (created immediately, but starts after user interaction)
  const audio = createAmbientEngine();
  const muteToggle = document.getElementById("muteToggle");
  const muteText = muteToggle?.querySelector("[data-i18n='ui.mute'], [data-i18n='ui.unmute'], .pill-text") || muteToggle?.querySelector(".pill-text");

  function setMutedUI(muted) {
    if (!muteToggle) return;
    muteToggle.setAttribute("aria-pressed", muted ? "true" : "false");

    // Update label using i18n keys if present
    const dict = I18N[resolveLang()] || I18N.en;
    const label = muted ? (dict["ui.mute"] || "Muted") : (dict["ui.unmute"] || "Audio");
    const t = muteToggle.querySelector(".pill-text");
    if (t) t.textContent = label;
  }

  setMutedUI(true);

  async function unmuteAndStart() {
    await audio.ensureRunning();
    audio.setMuted(false);
    setMutedUI(false);
  }

  async function mute() {
    await audio.ensureRunning();
    audio.setMuted(true);
    setMutedUI(true);
  }

  if (muteToggle) {
    muteToggle.addEventListener("click", async () => {
      await audio.ensureRunning();
      const isMuted = audio.toggleMute();
      setMutedUI(isMuted);
    });
  }

  // Enter flow
  let entered = false;
  const enterBtn = document.getElementById("enterBtn");
  if (enterBtn) {
    enterBtn.addEventListener("click", async () => {
      entered = true;
      world.setEntered(true);
      // Start audio but keep user control: unmute on enter
      await unmuteAndStart();
      setActiveChapter("memory");
    });
  }

  // Nav actions
  document.querySelectorAll("[data-action='goto']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const target = btn.getAttribute("data-target");
      if (!target) return;

      // If user hasn't entered yet, entering should feel earned:
      // allow "Peek inside" without audio unless they unmute manually
      if (!entered && target !== "threshold") {
        world.setEntered(true);
      }

      setActiveChapter(target);
    });
  });

  document.querySelectorAll("[data-action='home']").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      setActiveChapter("threshold");
    });
  });

  // Allow first click anywhere to resume audio context (but keep it muted unless Enter pressed)
  // (prevents some browsers from refusing later)
  window.addEventListener("pointerdown", async () => {
    try { await audio.ensureRunning(); } catch {}
  }, { once: true, passive: true });

  // Start on threshold
  setActiveChapter("threshold");
})();
