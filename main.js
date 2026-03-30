import { resolveLang, applyI18n, I18N, setLang } from "./i18n.js";
import { createAmbientEngine } from "./audio.js";
import { createWorld } from "./world.js";
import { revealSequence } from "./textfx.js";

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

(function () {
  const isMobile =
    window.matchMedia("(max-width: 820px)").matches ||
    window.matchMedia("(pointer: coarse)").matches;

  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

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

  // Mobile: Enter button is meaningless in fallback mode
  if (isMobile) {
    const enterBtn = document.getElementById("enterBtn");
    if (enterBtn) enterBtn.remove();
  }

  // Mini navigation tutorial (desktop only)
  const navHint = document.getElementById("navHint");
  if (navHint && !isMobile) {
    navHint.classList.add("is-on");
    navHint.setAttribute("aria-hidden", "false");
    setTimeout(() => {
      navHint.classList.remove("is-on");
      navHint.setAttribute("aria-hidden", "true");
    }, 5200);
  }

  const bwMemory = document.getElementById("bwMemory");
  const bwReplay = document.getElementById("bwReplay");
  const bwStructure = document.getElementById("bwStructure");
  const bwEdge = document.getElementById("bwEdge");
  function setWord(el, on) {
    if (el) el.classList.toggle("is-on", !!on);
  }

  const scan = document.createElement("div");
  scan.className = "scanline";
  document.body.appendChild(scan);
  function ritualScan() {
    scan.classList.remove("is-on");
    void scan.offsetWidth;
    scan.classList.add("is-on");
    setTimeout(() => scan.classList.remove("is-on"), 950);
  }

  const hud = document.getElementById("hud");
  const hudTitle = document.getElementById("hudTitle");
  const hudSub = document.getElementById("hudSub");

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
    const label = muted
      ? dict["ui.mute"] || "Muted"
      : dict["ui.unmute"] || "Audio";
    const t = muteToggle.querySelector(".pill-text");
    if (t) t.textContent = label;
  }

  // Mobile: keep muted. Desktop: try to start unmuted (autoplay may block).
  if (isMobile) {
    setMutedUI(true);
  } else {
    setMutedUI(false);
    (async () => {
      try {
        await audio.ensureRunning();
        await audio.setMuted(false);
        setMutedUI(false);
      } catch {
        // Autoplay blocked → show muted until first user gesture
        setMutedUI(true);

        const arm = async () => {
          try {
            await audio.ensureRunning();
            await audio.setMuted(false);
            setMutedUI(false);
          } catch {}
        };

        window.addEventListener("pointerdown", arm, { once: true, passive: true });
        window.addEventListener("wheel", arm, { once: true, passive: true });
        window.addEventListener("keydown", arm, { once: true, passive: true });
      }
    })();
  }

  if (muteToggle) {
    muteToggle.addEventListener("click", async () => {
      await audio.ensureRunning();
      const isMuted = await audio.toggleMute();
      setMutedUI(isMuted);
    });
  }

  // World (desktop only)
  let world = null;
  if (!isMobile) {
    world = createWorld(document.getElementById("world"), {
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

        const title = data.title || "";
        const idMatch = title.match(/\b(?:EX|IP|MF)-\d+\b/);
        const id = idMatch ? idMatch[0] : null;

        // EX-* → image lightbox
        if (id && id.startsWith("EX-")) {
          const map = {
            "EX-1": {
              src: "assets/replay.jpg",
              title: "Replay Engine",
              cap: "Reconstructed moments suspended in time.",
            },
            "EX-2": {
              src: "assets/settings.jpg",
              title: "Assumptions + Presets",
              cap: "Constraints, validation, and repeatable runs.",
            },
            "EX-3": {
              src: "assets/journal.jpg",
              title: "Journal + Export",
              cap: "Memory fragments turned into evidence.",
            },
            "EX-4": {
              src: "assets/replay-trader.jpg",
              title: "Replay Trader",
              cap: "Execution inside preserved volatility.",
            },
            "EX-5": {
              src: "assets/strategy-trades.jpg",
              title: "Strategy → Trades",
              cap: "From structure to outcomes — preserved.",
            },
            "EX-6": {
              src: "assets/place-holder-strat.jpg",
              title: "Strategy Capsule (WIP)",
              cap: "A placeholder surface for the system layer.",
            },
          };
          const ex = map[id];
          if (ex) openBox(ex);
          return;
        }

        // IP-* / MF-* → text lightbox (readable)
        if (id && (id.startsWith("IP-") || id.startsWith("MF-"))) {
          openBox({
            src: null,
            title: data.title || "INFO",
            cap: data.body || "",
          });
          return;
        }
      },
    });
  }

  // ESC closes overlays
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeImgBox();
      setPanel(null);
      if (world?.clearSelection) world.clearSelection();
    }
  });

  // Chapters
  const chapters = Array.from(document.querySelectorAll(".chapter"));
  function getChapterEl(name) {
    return chapters.find((c) => c.getAttribute("data-chapter") === name);
  }

  // Panel copy for desktop (so center cards can stay minimal)
  const chapterPanelCopy = {
    threshold: {
      title: "THRESHOLD",
      body:
        "Every market leaves a trace. Precision begins where memory is organized.\n\n" +
        "Enter to travel the archive.",
    },
    memory: {
      title: "MEMORY FIELD",
      body:
        "Market decisions don’t disappear.\n\n" +
        "Stored imprints. Retrieved patterns. Quiet, repeatable learning.",
    },
    replay: {
      title: "REPLAY CHAMBER",
      body:
        "Revisit the moment before hindsight.\n\n" +
        "Time as a surface you can move through — not a chart you scroll past.",
    },
    structure: {
      title: "STRATEGY STRUCTURE",
      body:
        "Turn repetition into architecture.\n\n" +
        "Rules. Constraints. Risk. Execution — wired into a system you can trust.",
    },
    edge: {
      title: "ACCESS POINT",
      body:
        "Follow development.\n\n" +
        "Private builds. Public beta starts at v0.5.0 (limited invites).",
    },
  };

  let active = "threshold";
  async function setActiveChapter(name, { ritual = false } = {}) {
    if (active === name) return;
    active = name;

    chapters.forEach((c) =>
      c.classList.toggle("is-active", c.getAttribute("data-chapter") === name)
    );

    if (world?.setChapter) world.setChapter(name);

    // Desktop-only: push chapter copy into the bottom-right panel
    if (!isMobile) {
      const copy = chapterPanelCopy[name];
      if (copy) setPanel(copy);
    }

    const el = getChapterEl(name);
    if (el) await revealSequence(el);

    if (ritual) ritualScan();
  }

  // Desktop rail
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
    if (world?.setRail) world.setRail(rail);

    const ch = chapterForRail(rail);
    setActiveChapter(ch);

    setWord(bwMemory, ch === "memory");
    setWord(bwReplay, ch === "replay");
    setWord(bwStructure, ch === "structure");
    setWord(bwEdge, ch === "edge");

    requestAnimationFrame(tickRail);
  }

  let entered = false;
  const hero = document.getElementById("hero");
  function setHeroOff() {
    if (hero) hero.classList.add("is-off");
    if (hero) hero.setAttribute("aria-hidden", "true");
  }

  // Ensure panel has something useful on first render (desktop)
  if (!isMobile) {
    const initial = chapterPanelCopy.threshold;
    if (initial) setPanel(initial);
  }

  function onWheel(e) {
    try {
      if (!entered) {
        world?.setEntered?.(true);
        entered = true;
        setHeroOff();
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

  if (!isMobile) {
    requestAnimationFrame(tickRail);
    window.addEventListener("wheel", onWheel, { passive: false });
  }

  // Enter starts journey (desktop only; button removed on mobile)
  const enterBtn = document.getElementById("enterBtn");
  if (enterBtn) {
    enterBtn.addEventListener("click", async () => {
      entered = true;
      world?.setEntered?.(true);
      setHeroOff();

      await audio.ensureRunning();
      await audio.setMuted(false);
      setMutedUI(false);

      railTarget = 0.02;
      await setActiveChapter("threshold", { ritual: true });
    });
  }

  // Nav jumps
  const jump = {
    threshold: 0.0,
    memory: 0.3,
    replay: 0.56,
    structure: 0.78,
    edge: 1.0,
  };

  document.querySelectorAll("[data-action='goto']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const target = btn.getAttribute("data-target");
      if (!target) return;

      if (isMobile) {
        const el = document.querySelector(`#chapter-${target}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      if (!(target in jump)) return;

      if (!entered && target !== "threshold") {
        world?.setEntered?.(true);
        entered = true;
        setHeroOff();
      }

      railTarget = jump[target];
      await setActiveChapter(target, { ritual: true });
    });
  });

  document.querySelectorAll("[data-action='home']").forEach((a) => {
    a.addEventListener("click", async (e) => {
      e.preventDefault();

      if (isMobile) {
        const el = document.querySelector("#chapter-threshold");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      railTarget = 0.0;
      await setActiveChapter("threshold", { ritual: true });
    });
  });

  // Prime audio on first interaction (safe on both; mobile stays muted anyway)
  window.addEventListener(
    "pointerdown",
    async () => {
      try {
        await audio.ensureRunning();
      } catch {}
    },
    { once: true, passive: true }
  );

  setActiveChapter("threshold");

  // On desktop, keep hero visible until first enter/scroll/nav.
  // If you ever want to start "already entered" in the future, call setHeroOff() here.

})();
