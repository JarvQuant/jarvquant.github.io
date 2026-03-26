import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

export function createWorld(canvas, { onHoverFragment } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05060a, 0.045);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  camera.position.set(0, 1.4, 7.6);

  // Subtle light (mostly for points/material nuance)
  const ambient = new THREE.AmbientLight(0xffffff, 0.65);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0x88ddff, 0.25);
  dir.position.set(3, 7, 4);
  scene.add(dir);

  // Infinite-ish grid illusion: 2 layered grids + slow drift
  const grid1 = new THREE.GridHelper(120, 120, 0x1bd5ff, 0x1bd5ff);
  grid1.material.opacity = 0.08;
  grid1.material.transparent = true;
  grid1.position.y = -1.1;
  scene.add(grid1);

  const grid2 = new THREE.GridHelper(120, 30, 0x7b2cff, 0x7b2cff);
  grid2.material.opacity = 0.035;
  grid2.material.transparent = true;
  grid2.position.y = -1.08;
  scene.add(grid2);

  // Distant coordinate nodes (points)
  const N = 120;
  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const base = new Float32Array(N * 3);

  const c1 = new THREE.Color(0x6D28D9);
  const c2 = new THREE.Color(0x22D3EE);

  const fragments = [];
  for (let i = 0; i < N; i++) {
    const x = (Math.random() * 2 - 1) * 16;
    const y = (Math.random() * 2 - 1) * 5 + 0.2;
    const z = (Math.random() * 2 - 1) * 18;

    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    base[i * 3 + 0] = x;
    base[i * 3 + 1] = y;
    base[i * 3 + 2] = z;

    const mix = Math.random();
    const col = c1.clone().lerp(c2, mix);
    colors[i * 3 + 0] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;

    // pseudo fragments (we'll make them meaningful later)
    fragments.push({
      title: `Fragment ${String(i + 1).padStart(2, "0")}`,
      sub: `T-${Math.floor(Math.random() * 220 + 12)}d · setup echo · archived impulse`,
    });
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.06,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geom, mat);
  scene.add(points);

  // A few "memory capsules" as small boxes closer to camera (raycastable)
  const capsuleGroup = new THREE.Group();
  scene.add(capsuleGroup);

  const capsuleMat = new THREE.MeshStandardMaterial({
    color: 0x0b0f1a,
    metalness: 0.15,
    roughness: 0.28,
    transparent: true,
    opacity: 0.55,
    emissive: new THREE.Color(0x000000),
  });

  const capsuleGlow = new THREE.MeshStandardMaterial({
    color: 0x07101a,
    metalness: 0.0,
    roughness: 0.6,
    transparent: true,
    opacity: 0.16,
    emissive: new THREE.Color(0x22D3EE),
    emissiveIntensity: 0.25,
  });

  const capsuleData = [];
  const capsuleCount = 14;
  for (let i = 0; i < capsuleCount; i++) {
    const w = 0.46 + Math.random() * 0.36;
    const h = 0.20 + Math.random() * 0.18;
    const d = 0.22 + Math.random() * 0.26;

    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, capsuleMat.clone());
    const glow = new THREE.Mesh(geo, capsuleGlow);

    const angle = (i / capsuleCount) * Math.PI * 2;
    const r = 2.7 + Math.random() * 1.1;

    mesh.position.set(Math.cos(angle) * r, 0.0 + (Math.random() * 0.6), -1.8 + Math.sin(angle) * r);
    glow.position.copy(mesh.position);

    mesh.rotation.set((Math.random() * 0.25), (Math.random() * 0.45), 0);
    glow.rotation.copy(mesh.rotation);

    capsuleGroup.add(glow);
    capsuleGroup.add(mesh);

    capsuleData.push({
      mesh,
      glow,
      title: ["Decision Capsule", "Journal Imprint", "Replay Fragment"][i % 3],
      sub: [
        "Entry · SL · TP · outcome",
        "Reflection · mistake · constraint",
        "Setup · context · volatility"
      ][i % 3]
    });
  }

  // Raycast interaction
  const raycaster = new THREE.Raycaster();
  raycaster.params.Points.threshold = 0.15;
  const pointer = new THREE.Vector2(0, 0);
  let hovered = null;

  function setPointerFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    pointer.x = x * 2 - 1;
    pointer.y = -(y * 2 - 1);
  }

  const state = {
    entered: false,
    targetChapter: "threshold",
    mouseX: 0,
    mouseY: 0,
  };

  function setChapter(name) {
    state.targetChapter = name;
  }

  function setEntered(v) {
    state.entered = !!v;
  }

  // Animate
  let t0 = performance.now();

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function updateHover() {
    // Only show hover HUD after entering (feels earned)
    if (!state.entered) {
      if (hovered) hovered = null;
      if (onHoverFragment) onHoverFragment(null);
      return;
    }

    raycaster.setFromCamera(pointer, camera);

    // Intersect capsules first (feels more meaningful)
    const capsuleMeshes = capsuleData.map(x => x.mesh);
    const hitsCaps = raycaster.intersectObjects(capsuleMeshes, false);
    if (hitsCaps.length) {
      const m = hitsCaps[0].object;
      const item = capsuleData.find(x => x.mesh === m);
      if (item && hovered !== item.mesh.uuid) {
        hovered = item.mesh.uuid;
        if (onHoverFragment) onHoverFragment({ title: item.title, sub: item.sub });
      }
      return;
    }

    // Then points (less strong)
    const hits = raycaster.intersectObject(points, false);
    if (hits.length) {
      const idx = hits[0].index;
      const f = fragments[idx];
      if (hovered !== `p:${idx}`) {
        hovered = `p:${idx}`;
        if (onHoverFragment) onHoverFragment({ title: f.title, sub: f.sub });
      }
    } else {
      if (hovered !== null) {
        hovered = null;
        if (onHoverFragment) onHoverFragment(null);
      }
    }
  }

  function tick(now) {
    const dt = (now - t0) / 1000;
    t0 = now;

    // subtle drift
    const time = now * 0.0002;
    grid1.position.x = (Math.sin(time) * 0.35);
    grid1.position.z = (Math.cos(time) * 0.35);
    grid2.position.x = (Math.cos(time * 0.7) * 0.18);
    grid2.position.z = (Math.sin(time * 0.7) * 0.18);

    // pointer-based parallax (very restrained)
    const px = clamp(state.mouseX, -1, 1);
    const py = clamp(state.mouseY, -1, 1);
    camera.position.x += (px * 0.35 - camera.position.x) * 0.06;
    camera.position.y += ((1.35 + py * 0.18) - camera.position.y) * 0.06;

    // chapter-dependent camera nudge
    const zTargets = {
      threshold: 7.6,
      memory: 6.4,
      replay: 6.9,
      structure: 6.7,
      edge: 7.2,
    };
    const zt = zTargets[state.targetChapter] ?? 7.6;
    camera.position.z += (zt - camera.position.z) * 0.04;

    // animate capsules: slow orbit + activation accent when hovered
    capsuleGroup.rotation.y += dt * 0.06;

    for (const c of capsuleData) {
      const isOn = hovered === c.mesh.uuid;
      const targetEm = isOn ? 0.55 : 0.18;
      c.glow.material.opacity += ( (isOn ? 0.22 : 0.12) - c.glow.material.opacity) * 0.08;
      c.glow.material.emissiveIntensity += (targetEm - c.glow.material.emissiveIntensity) * 0.08;
      c.mesh.material.opacity += ((isOn ? 0.78 : 0.55) - c.mesh.material.opacity) * 0.08;
    }

    updateHover();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  function onPointerMove(e) {
    setPointerFromEvent(e);
    // normalized -1..1
    state.mouseX = pointer.x;
    state.mouseY = pointer.y;
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  resize();
  requestAnimationFrame(tick);

  return {
    setChapter,
    setEntered,
    dispose() {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      renderer.dispose();
    }
  };
}
