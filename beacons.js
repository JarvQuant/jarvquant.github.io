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
    root.appendChild(el);
    els.set(b.id, el);
    return el;
  }

  let raf = 0;
  function tick() {
    const list = world.getBeaconScreenspace();
    for (const b of list) {
      const el = ensure(b);
      const on = b.z < 1 && b.x > -50 && b.x < window.innerWidth + 50 && b.y > -50 && b.y < window.innerHeight + 50;
      el.classList.toggle("is-on", on);
      el.style.left = `${b.x}px`;
      el.style.top = `${b.y}px`;
    }
    raf = requestAnimationFrame(tick);
  }

  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
