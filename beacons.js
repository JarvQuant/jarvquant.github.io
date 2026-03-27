export function mountBeacons(world) {
  const root = document.getElementById("beacons");
  if (!root || !world?.getBeaconScreenspace) return () => {};

  const els = new Map();

  function ensure(b) {
    let el = els.get(b.id);
    if (el) return el;

    el = document.createElement("div");
    el.className = "beacon";
    el.innerHTML = `<div class="beacon-title"></div><div class="beacon-body"></div>`;
    el.querySelector(".beacon-title").textContent = b.title;
    el.querySelector(".beacon-body").textContent = b.body;

    // Click → open text lightbox via event (main.js listens)
    el.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("jq:beaconOpen", { detail: b }));
    });

    root.appendChild(el);
    els.set(b.id, el);
    return el;
  }

  let raf = 0;
  function tick() {
    const list = world.getBeaconScreenspace();

    // Sort by depth so near ones win
    const sorted = [...list].sort((a, b) => a.z - b.z);

    let shown = 0;
    for (const b of sorted) {
      const el = ensure(b);

      const inView =
        b.z < 1 &&
        b.x > -80 && b.x < window.innerWidth + 80 &&
        b.y > -80 && b.y < window.innerHeight + 80;

      // reduce clutter around center (gallery zone)
      const cx = window.innerWidth * 0.5;
      const cy = window.innerHeight * 0.5;
      const dist = Math.hypot(b.x - cx, b.y - cy);

      // centerFade: near center -> low, far -> high
      const centerFade = Math.max(0, Math.min(1, (dist - 140) / 260));

      const allow = inView && (shown < 2) && centerFade > 0.15;
      el.classList.toggle("is-on", allow);

      if (allow) {
        shown++;
        el.style.left = `${b.x}px`;
        el.style.top = `${b.y}px`;
        el.style.opacity = String(0.25 + 0.75 * centerFade);
      }
    }

    raf = requestAnimationFrame(tick);
  }

  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
