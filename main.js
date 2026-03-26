(function () {
  // Year
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // Tilt (scoped to the card so it doesn't freak out)
  const tiltEl = document.querySelector("[data-tilt]");
  if (tiltEl) {
    const maxTilt = 9;  // degrees
    const maxMove = 6;  // px
    let raf = 0;

    function applyTilt(clientX, clientY) {
      const r = tiltEl.getBoundingClientRect();
      const px = (clientX - (r.left + r.width / 2)) / (r.width / 2);
      const py = (clientY - (r.top + r.height / 2)) / (r.height / 2);

      const cx = Math.max(-1, Math.min(1, px));
      const cy = Math.max(-1, Math.min(1, py));

      const rx = (-cy * maxTilt).toFixed(2);
      const ry = (cx * maxTilt).toFixed(2);
      const tx = (cx * maxMove).toFixed(2);
      const ty = (cy * maxMove).toFixed(2);

      tiltEl.style.transform =
        `rotateX(${rx}deg) rotateY(${ry}deg) translate3d(${tx}px, ${ty}px, 0)`;
    }

    function onMove(e) {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        applyTilt(e.clientX, e.clientY);
      });
    }

    function reset() {
      tiltEl.style.transform = "rotateX(0deg) rotateY(0deg) translate3d(0,0,0)";
    }

    tiltEl.addEventListener("pointermove", onMove, { passive: true });
    tiltEl.addEventListener("pointerleave", reset, { passive: true });
    tiltEl.addEventListener("pointerdown", reset, { passive: true });
  }

  // Lightbox
  const box = document.getElementById("lightbox");
  const img = document.getElementById("lightbox-img");

  function open(src) {
    if (!box || !img) return;
    img.src = src;
    box.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function close() {
    if (!box || !img) return;
    box.setAttribute("aria-hidden", "true");
    img.src = "";
    document.body.style.overflow = "";
  }

  document.querySelectorAll("[data-lightbox]").forEach((el) => {
    el.addEventListener("click", () => open(el.getAttribute("data-lightbox")));
  });

  document.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", close);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
})();
