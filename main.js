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

  // World (desktop only)
  let world = null;

  const langSelect = document.getElementById("langSelect");
  if (langSelect) {
    langSelect.value = lang;
    langSelect.addEventListener("change", () => {
      const next = setLang(langSelect.value);
      applyI18n(next);
      world?.setLang?.(next);
    });
  }

  // Enter button has been removed in the Ghost Cathedral redesign —
  // scroll now handles the transition (hero dismisses on first wheel).
  // (Left intentionally empty — kept for diff clarity.)

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
  if (!isMobile) {
    world = createWorld(document.getElementById("world"), {
      lang: resolveLang(),
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

  // Progress rail elements
  const progDots = Array.from(document.querySelectorAll(".prog-dot"));
  const progFill = document.getElementById("progFill");
  const chapterOrder = ["threshold", "memory", "replay", "structure", "edge"];

  let active = "threshold";
  async function setActiveChapter(name, { ritual = false } = {}) {
    if (active === name) return;
    active = name;

    chapters.forEach((c) =>
      c.classList.toggle("is-active", c.getAttribute("data-chapter") === name)
    );

    // Body class for per-chapter accent recoloring (CSS hooks)
    document.body.classList.remove("ch-threshold","ch-memory","ch-replay","ch-structure","ch-edge");
    document.body.classList.add("ch-" + name);

    // Progress rail dot active state
    progDots.forEach((d) =>
      d.classList.toggle("is-active", d.getAttribute("data-chapter") === name)
    );

    if (world?.setChapter) world.setChapter(name);

    const el = getChapterEl(name);
    // Fresh entry into Edge → scroll back to top so exhibit is seen first
    if (el && name === "edge") el.scrollTop = 0;
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

    // Progress rail fill — smooth bar that tracks rail position
    if (progFill) {
      progFill.style.height = (rail * 100).toFixed(2) + "%";
    }

    requestAnimationFrame(tickRail);
  }

  let entered = false;
  const hero = document.getElementById("hero");
  function setHeroOff() {
    if (hero) hero.classList.add("is-off");
    if (hero) hero.setAttribute("aria-hidden", "true");
    // Reveal chapter field-notes (CSS gates them on body.is-entered)
    document.body.classList.add("is-entered");
  }

  // Dismiss hero on first wheel/pointer without requiring scroll delta — smoother UX.
  async function enterArchive() {
    if (entered) return;
    entered = true;
    world?.setEntered?.(true);
    setHeroOff();
    try {
      await audio.ensureRunning();
      await audio.setMuted(false);
      setMutedUI(false);
    } catch {}
  }

  // Bottom-right panel is reserved for record selection (not for static chapter copy).

  function onWheel(e) {
    try {
      if (!entered) enterArchive();

      if (isLightboxOpen()) return;

      // When the rail is at the end AND the edge chapter is active,
      // hand the wheel over so the user can scroll the pricing section.
      if (active === "edge" && railTarget >= 0.999) {
        const edgeEl = getChapterEl("edge");
        if (edgeEl) {
          const atTop = edgeEl.scrollTop <= 0;
          const atBottom =
            edgeEl.scrollTop + edgeEl.clientHeight >= edgeEl.scrollHeight - 1;
          // Scroll-down inside edge, OR scroll-up while edge still has content above
          if ((e.deltaY > 0 && !atBottom) || (e.deltaY < 0 && !atTop)) {
            edgeEl.scrollTop += e.deltaY;
            e.preventDefault();
            return;
          }
          // If at top and scrolling up, fall through to rail (go back to Structure)
        }
      }

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

  // Enter button removed — hero now dismisses on the first scroll (see onWheel).

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

      if (!entered) await enterArchive();

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

  // Exhibition — 3D rotating ring carousel
  (function initExhibit() {
    const ring = document.getElementById("exhibitRing");
    const stage = document.getElementById("exhibitStage");
    if (!ring || !stage) return;

    const cards = Array.from(ring.querySelectorAll(".exhibit-card"));
    const total = cards.length;
    if (!total) return;

    const titleEl = document.getElementById("exhibitTitle");
    const capEl = document.getElementById("exhibitCap");
    const idxEl = document.getElementById("exhibitIdx");
    const totalEl = document.getElementById("exhibitTotal");
    const prevBtn = document.getElementById("exhibitPrev");
    const nextBtn = document.getElementById("exhibitNext");

    if (totalEl) totalEl.textContent = String(total);

    const step = 360 / total;
    let current = 0;
    let angle = 0; // accumulated rotation (can go negative/positive)

    function render() {
      ring.style.setProperty("--ex-angle", `${angle}deg`);
      cards.forEach((c, i) => c.classList.toggle("is-active", i === current));
      const active = cards[current];
      if (active) {
        if (titleEl) titleEl.textContent = active.dataset.title || "";
        if (capEl) capEl.textContent = active.dataset.cap || "";
      }
      if (idxEl) idxEl.textContent = String(current + 1);
    }

    function go(delta) {
      current = (current + delta + total) % total;
      // Rotate the ring in the opposite direction so the selected card faces the camera
      angle -= delta * step;
      render();
    }

    function goTo(target) {
      let delta = target - current;
      // pick shortest path around the ring
      if (delta > total / 2) delta -= total;
      if (delta < -total / 2) delta += total;
      go(delta);
    }

    if (prevBtn) prevBtn.addEventListener("click", () => go(-1));
    if (nextBtn) nextBtn.addEventListener("click", () => go(1));

    cards.forEach((c, i) => {
      c.addEventListener("click", (e) => {
        e.preventDefault();
        if (i !== current) {
          goTo(i);
          return;
        }
        // Active card → open lightbox (zoomed view)
        const img = c.querySelector("img");
        openBox({
          src: img ? img.getAttribute("src") : null,
          title: c.dataset.title || "",
          cap: c.dataset.cap || "",
        });
      });
    });

    // Keyboard when focused within the exhibit
    const exhibitSection = stage.closest(".exhibit");
    if (exhibitSection) {
      exhibitSection.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
        if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      });
    }

    // Touch/drag to rotate
    let dragStartX = null;
    let dragMoved = false;
    stage.addEventListener("pointerdown", (e) => {
      dragStartX = e.clientX;
      dragMoved = false;
    });
    stage.addEventListener("pointermove", (e) => {
      if (dragStartX == null) return;
      if (Math.abs(e.clientX - dragStartX) > 8) dragMoved = true;
    });
    stage.addEventListener("pointerup", (e) => {
      if (dragStartX == null) return;
      const dx = e.clientX - dragStartX;
      dragStartX = null;
      if (!dragMoved) return;
      if (dx < -40) go(1);
      else if (dx > 40) go(-1);
    });
    stage.addEventListener("pointercancel", () => { dragStartX = null; });

    render();
  })();

  // Read-mode auto-dim — after ~3.5s without input, dim non-essential chrome
  // so the user's focus goes to the dossier copy. Any input wakes it instantly.
  if (!isMobile) {
    let readTimer = null;
    const WAKE_EVENTS = ["pointermove", "wheel", "keydown", "pointerdown"];
    const wake = () => {
      document.body.classList.remove("is-reading");
      if (readTimer) clearTimeout(readTimer);
      readTimer = setTimeout(() => {
        if (!isLightboxOpen()) document.body.classList.add("is-reading");
      }, 3500);
    };
    WAKE_EVENTS.forEach((ev) =>
      window.addEventListener(ev, wake, { passive: true })
    );
    wake();
  }

  // Prime body class + first dot + world planet highlight before the chapter
  // actually changes (since setActiveChapter early-exits if active === name).
  document.body.classList.add("ch-threshold");
  progDots.forEach((d) =>
    d.classList.toggle("is-active", d.getAttribute("data-chapter") === "threshold")
  );
  if (world?.setChapter) world.setChapter("threshold");
  setActiveChapter("threshold");

  // On desktop, keep hero visible until first enter/scroll/nav.
  // If you ever want to start "already entered" in the future, call setHeroOff() here.

})();
