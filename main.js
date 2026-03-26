(function () {
  // Year
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // Simple tilt (parallax 3D feel)
  const tiltEl = document.querySelector("[data-tilt]");
  if (tiltEl) {
    const maxTilt = 10; // degrees
    const maxMove = 8;  // px

    function onMove(clientX, clientY) {
      const r = tiltEl.getBoundingClientRect();
      const px = (clientX - (r.left + r.width / 2)) / (r.width / 2);
      const py = (clientY - (r.top + r.height / 2)) / (r.height / 2);

      const rx = (-py * maxTilt).toFixed(2);
      const ry = (px * maxTilt).toFixed(2);
      const tx = (px * maxMove).toFixed(2);
      const ty = (py * maxMove).toFixed(2);

      tiltEl.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translate3d(${tx}px, ${ty}px, 0)`;
    }

    function reset() {
      tiltEl.style.transform = "rotateX(0deg) rotateY(0deg) translate3d(0,0,0)";
    }

    // Mouse
    window.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY), { passive: true });
    window.addEventListener("mouseleave", reset);

    // Mobile gyro (optional, safe fallback)
    if (window.DeviceOrientationEvent) {
      window.addEventListener("deviceorientation", (e) => {
        if (e.beta == null || e.gamma == null) return;
        const px = Math.max(-1, Math.min(1, e.gamma / 30));
        const py = Math.max(-1, Math.min(1, e.beta / 30));
        const r = tiltEl.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        onMove(cx + px * (r.width / 2), cy + py * (r.height / 2));
      }, { passive: true });
    }
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
