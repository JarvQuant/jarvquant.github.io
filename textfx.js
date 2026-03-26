function randInt(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); }

const GLYPHS = "[]{}()<>/\\|=-_+*#@$%:;,.~^0123456789";

export function mountTextFX(root = document) {
  // Minimal parallax for text blocks
  const blocks = Array.from(root.querySelectorAll(".chapter.is-active .chapter-kicker, .chapter.is-active .chapter-title, .chapter.is-active .chapter-sub"));
  let mx = 0, my = 0;

  function onMove(e) {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = (e.clientY / window.innerHeight) * 2 - 1;
    mx = x; my = y;
    for (const b of blocks) {
      const w = b.classList.contains("chapter-title") ? 6 : 3;
      b.style.transform = `translate3d(${mx * w}px, ${my * w}px, 0)`;
    }
  }
  window.addEventListener("pointermove", onMove, { passive: true });

  return () => window.removeEventListener("pointermove", onMove);
}

export async function revealSequence(sectionEl) {
  if (!sectionEl) return;

  const els = [
    sectionEl.querySelector(".chapter-kicker"),
    sectionEl.querySelector(".chapter-title"),
    sectionEl.querySelector(".chapter-sub"),
    sectionEl.querySelector(".chapter-actions"),
    sectionEl.querySelector(".micro"),
  ].filter(Boolean);

  // Reset
  for (const el of els) {
    el.style.opacity = "0";
    el.style.transform = "translate3d(0,10px,0)";
  }

  // Stagger in
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    await new Promise(r => setTimeout(r, 90 + i * 55));
    el.style.transition = "opacity .55s ease, transform .55s ease";
    el.style.opacity = "1";
    el.style.transform = "translate3d(0,0,0)";
  }
}

export function glyphScramble(el, { durationMs = 520, intensity = 0.55 } = {}) {
  if (!el) return;
  const original = el.textContent || "";
  const chars = original.split("");
  const start = performance.now();

  function tick(now) {
    const t = (now - start) / durationMs;
    if (t >= 1) {
      el.textContent = original;
      return;
    }

    const out = chars.map((ch) => {
      if (ch === " " || ch === "—") return ch;
      if (Math.random() < intensity * (1 - t)) {
        return GLYPHS[randInt(0, GLYPHS.length - 1)];
      }
      return ch;
    });

    el.textContent = out.join("");
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
