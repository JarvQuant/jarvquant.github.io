import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function makeRecord(i) {
  const setups = ["Liquidity Sweep", "Breakout Retest", "Compression", "Impulse Pullback", "Range Fade", "Reversion"];
  const instruments = ["ES", "NQ", "DAX", "BTC", "EURUSD", "CL"];
  const notes = [
    "The entry was clean. The hesitation wasn’t.",
    "I saw the level. I ignored the pace.",
    "The market offered structure. I brought noise.",
    "Volatility was the context. Not the excuse.",
    "Edge appeared after I stopped narrating.",
    "The setup repeated. My discipline didn’t."
  ];
  const days = Math.floor(rand(3, 320));
  const hh = String(Math.floor(rand(6, 22))).padStart(2, "0");
  const mm = String(Math.floor(rand(0, 59))).padStart(2, "0");
  const r = (Math.round(rand(-18, 22)) / 10).toFixed(1);

  return {
    id: `JQ-${String(i + 1).padStart(4, "0")}`,
    ts: `T-${days}d · ${hh}:${mm}Z`,
    instrument: pick(instruments),
    setup: pick(setups),
    r: `${r}R`,
    note: pick(notes)
  };
}

function buildLattice({ size = 240, step = 6, color = 0x22D3EE, opacity = 0.08 } = {}) {
  const verts = [];
  const half = size / 2;

  for (let x = -half; x <= half; x += step) {
    for (let z = -half; z <= half; z += step) {
      verts.push(x, -half, z, x, half, z);
    }
  }
  const yStep = step * 3;
  for (let y = -half; y <= half; y += yStep) {
    for (let z = -half; z <= half; z += step) {
      verts.push(-half, y, z, half, y, z);
    }
  }
  for (let y = -half; y <= half; y += yStep) {
    for (let x = -half; x <= half; x += step) {
      verts.push(x, y, -half, x, y, half);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));

  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending
  });

  return new THREE.LineSegments(geom, mat);
}

function makeFrameGeometry(w, h) {
  return new THREE.PlaneGeometry(w, h, 1, 1);
}

function makeBorderMaterial({ color = 0x22D3EE, opacity = 0.20, thickness = 0.028, glow = 0.60 } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uThickness: { value: thickness },
      uGlow: { value: glow },
    },
    vertexShader: `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uThickness;
      uniform float uGlow;
      varying vec2 vUv;

      float edge(vec2 uv, float t){
        float l = smoothstep(0.0, t, uv.x);
        float r = smoothstep(0.0, t, 1.0 - uv.x);
        float b = smoothstep(0.0, t, uv.y);
        float top = smoothstep(0.0, t, 1.0 - uv.y);
        float e = min(min(l, r), min(b, top));
        return 1.0 - e;
      }

      void main(){
        float e = edge(vUv, uThickness);
        float g = pow(e, 1.55) * uGlow;
        float a = (e * uOpacity) + g * 0.26;
        gl_FragColor = vec4(uColor, a);
      }
    `
  });
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      resolve(tex);
    }, undefined, reject);
  });
}

// ---- Gallery clear zone helpers ----
// Our exhibits are around z ~ -10.5 in frameGroup-local space.
// We reserve a corridor around that wall so random frames don't sit in front of it.
function inGalleryClearZone(x, y, z) {
  // Corridor around the exhibit wall:
  // - z near the wall: [-16, -4]
  // - x wide enough to cover 3 columns: [-14, 14]
  // - y covers the 2 rows: [-6, 4]
  return (z > -16 && z < -4) && (x > -14 && x < 14) && (y > -6 && y < 4);
}

export function createWorld(canvas, { onHoverFragment, onSelectRecord } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05060a, 0.028);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 820);
  camera.position.set(0, 0.9, 10.5);

  scene.add(new THREE.AmbientLight(0xffffff, 0.80));
  const dir = new THREE.DirectionalLight(0x88ddff, 0.32);
  dir.position.set(6, 10, 6);
  scene.add(dir);

  const floor = new THREE.GridHelper(520, 260, 0xffffff, 0xffffff);
  floor.material.opacity = 0.035;
  floor.material.transparent = true;
  floor.position.y = -1.25;
  scene.add(floor);

  // Lattice origin (off-center)
  const origin = new THREE.Vector3(2.4, 2.2, -72);
  const yaw = 0.08;

  const latticeA = buildLattice({ size: 260, step: 6,  color: 0x22D3EE, opacity: 0.12 });
  latticeA.position.copy(origin);
  latticeA.rotation.y = yaw;
  scene.add(latticeA);

  const latticeB = buildLattice({ size: 260, step: 12, color: 0x6D28D9, opacity: 0.06 });
  latticeB.position.copy(origin);
  latticeB.rotation.y = yaw;
  scene.add(latticeB);

  // Far volumes
  const farVolumes = [];
  for (let k = 0; k < 6; k++) {
    const la = buildLattice({ size: 320 + k * 70, step: 6,  color: 0x22D3EE, opacity: 0.060 - k * 0.006 });
    const lb = buildLattice({ size: 320 + k * 70, step: 12, color: 0x6D28D9, opacity: 0.032 - k * 0.004 });

    la.position.set(origin.x, origin.y, origin.z - (k + 1) * 110);
    lb.position.copy(la.position);

    la.rotation.y = yaw + k * 0.01;
    lb.rotation.y = la.rotation.y;

    scene.add(la);
    scene.add(lb);
    farVolumes.push({ la, lb });
  }

  // Frames
  const frames = [];
  const frameGroup = new THREE.Group();
  frameGroup.position.set(0, 1.5, -70);
  scene.add(frameGroup);

  const baseBorder = makeBorderMaterial({ opacity: 0.22, thickness: 0.028, glow: 0.65 });
  const hoverBorder = makeBorderMaterial({ opacity: 0.38, thickness: 0.032, glow: 0.95 });
  const plateMat = new THREE.MeshBasicMaterial({ color: 0x070b14, transparent: true, opacity: 0.24 });

  // Dense small records — but avoid gallery corridor
  const smallCount = 320;
  for (let i = 0; i < smallCount; i++) {
    const rec = makeRecord(i);
    const w = rand(0.55, 1.35);
    const h = w * rand(0.55, 0.80);

    const border = new THREE.Mesh(makeFrameGeometry(w, h), baseBorder.clone());
    border.userData.rec = rec;

    const plate = new THREE.Mesh(makeFrameGeometry(w * 0.985, h * 0.985), plateMat.clone());
    plate.position.z = -0.001;
    border.add(plate);

    // sample positions until outside clear zone
    let x, y, z;
    for (let tries = 0; tries < 30; tries++) {
      x = rand(-10.5, 10.5);
      y = rand(-2.2, 5.4);
      z = rand(-34, 34);
      if (!inGalleryClearZone(x, y, z)) break;
    }

    border.position.set(x, y, z);
    border.rotation.y = rand(-0.75, 0.75);

    frameGroup.add(border);
    frames.push(border);
  }

  // Micro frames — also avoid gallery corridor
  const microCount = 900;
  for (let i = 0; i < microCount; i++) {
    const w = rand(0.12, 0.32);
    const h = w * rand(0.55, 0.90);
    const border = new THREE.Mesh(makeFrameGeometry(w, h), baseBorder.clone());

    let x, y, z;
    for (let tries = 0; tries < 25; tries++) {
      x = rand(-18, 18);
      y = rand(-4, 10);
      z = rand(-90, 30);
      if (!inGalleryClearZone(x, y, z)) break;
    }

    border.position.set(x, y, z);
    border.rotation.y = rand(-1.2, 1.2);
    border.rotation.x = rand(-0.25, 0.25);
    border.userData.rec = null;
    frameGroup.add(border);
  }

  // Exhibits (6) — slightly forward (z -9.2) so they read cleaner
  const exhibits = [
    { src: "assets/replay.jpg", title: "Replay Engine" },
    { src: "assets/settings.jpg", title: "Assumptions + Presets" },
    { src: "assets/journal.jpg", title: "Journal + Export" },
    { src: "assets/replay-trader.jpg", title: "Replay Trader" },
    { src: "assets/strategy-trades.jpg", title: "Strategy → Trades" },
    { src: "assets/place-holder-strat.jpg", title: "Strategy Capsule (WIP)" },
  ];

  const exhibitGeo = makeFrameGeometry(5.4, 3.2);
  const exhibitMeshes = [];

  for (let i = 0; i < exhibits.length; i++) {
    const rec = { id: `EX-${i + 1}`, ts: "exhibit", instrument: "JarvQuant", setup: exhibits[i].title, r: "—", note: "Exhibit plate." };

    const border = new THREE.Mesh(exhibitGeo, baseBorder.clone());
    border.userData.rec = rec;

    const plate = new THREE.Mesh(makeFrameGeometry(5.22, 3.05), plateMat.clone());
    plate.position.z = -0.001;

    const inner = new THREE.Mesh(
      makeFrameGeometry(5.05, 2.92),
      new THREE.MeshBasicMaterial({ color: 0x0a0f18, transparent: true, opacity: 0.90 })
    );
    inner.position.z = 0.001;

    border.add(plate);
    border.add(inner);

    const row = Math.floor(i / 3);
    const col = i % 3;

    border.position.set(-7.4 + col * 7.4, 1.15 - row * 4.1, -9.2);
    border.rotation.y = rand(-0.10, 0.10);

    frameGroup.add(border);
    frames.push(border);
    exhibitMeshes.push({ border, inner, src: exhibits[i].src });
  }

  (async () => {
    try {
      for (const ex of exhibitMeshes) {
        const tex = await loadTexture(ex.src);
        ex.inner.material = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.96 });
      }
    } catch {}
  })();

  // Side-distributed beacons
  const beacons = [
    { id: "b1", pos: new THREE.Vector3(-6.8, 2.2,  6),   title: "[THRESHOLD]", body: "Enter the archive.\nSilence before structure." },
    { id: "b2", pos: new THREE.Vector3( 7.2, 1.4, -22),  title: "[MEMORY]", body: "Every decision leaves structure behind.\nRecords don’t judge. They preserve." },
    { id: "b3", pos: new THREE.Vector3(-7.4, 1.2, -48),  title: "[REPLAY]", body: "Reconstruct the moment.\nTrain inside preserved volatility." },
    { id: "b4", pos: new THREE.Vector3( 7.8, 1.7, -76),  title: "[STRUCTURE]", body: "Turn repetition into architecture.\nRules make edge repeatable." },
    { id: "b5", pos: new THREE.Vector3(-6.4, 1.3, -110), title: "[EDGE]", body: "Precision is memory organized.\nAccess is earned, not sold." },
  ];

  // Selection leash
  const leashMat = new THREE.LineBasicMaterial({ color: 0x22D3EE, transparent: true, opacity: 0.0 });
  const leashGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const leash = new THREE.Line(leashGeom, leashMat);
  scene.add(leash);

  // Raycast
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(0, 0);

  let hovered = null;
  let selected = null;

  function setPointerFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    pointer.x = x * 2 - 1;
    pointer.y = -(y * 2 - 1);
  }

  const state = {
    entered: false,
    chapter: "threshold",
    mouseX: 0,
    mouseY: 0,
    rail: 0,
    railTarget: 0,
    focus: 0,
    focusTarget: 0,
    focusPos: new THREE.Vector3(0, 1.6, -30),
  };

  const chapterStops = { threshold: 0.00, memory: 0.32, replay: 0.55, structure: 0.77, edge: 1.00 };
  const biasX = 1.2;

  function setEntered(v) { state.entered = !!v; }
  function setChapter(name) { state.chapter = name; state.railTarget = chapterStops[name] ?? 0; }
  function setRail(t) { state.railTarget = clamp(t, 0, 1); }

  function clearSelection() {
    if (!selected) return;
    selected.material = selected.userData._matBase || selected.material;
    selected = null;
    state.focusTarget = 0;
    if (onSelectRecord) onSelectRecord(null);
  }

  function selectObject(obj) {
    if (!obj) return;
    selected = obj;
    state.focusTarget = 1;

    const rec = obj.userData.rec;
    if (onSelectRecord) {
      if (rec?.id?.startsWith("EX-")) {
        onSelectRecord({ title: `${rec.id} · ${rec.setup}`, body: `Exhibit plate.\nClick again or press ESC to close.` });
      } else if (rec) {
        onSelectRecord({
          title: `${rec.id} · ${rec.instrument} · ${rec.setup}`,
          body: `${rec.ts} · ${rec.r}\n\n${rec.note}`
        });
      } else {
        onSelectRecord(null);
      }
    }

    obj.getWorldPosition(state.focusPos);
  }

  function updateHover() {
    if (!state.entered) {
      if (hovered) hovered = null;
      if (onHoverFragment) onHoverFragment(null);
      return;
    }

    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(frames, false);

    if (hits.length) {
      const obj = hits[0].object;

      if (!obj.userData.rec) {
        if (hovered && hovered !== selected) hovered.material = hovered.userData._matBase || hovered.material;
        hovered = null;
        if (onHoverFragment) onHoverFragment(null);
        return;
      }

      if (hovered !== obj) {
        if (hovered && hovered !== selected) hovered.material = hovered.userData._matBase || hovered.material;
        hovered = obj;

        if (!obj.userData._matBase) obj.userData._matBase = obj.material;
        if (obj !== selected) obj.material = hoverBorder.clone();

        const rec = obj.userData.rec;
        if (onHoverFragment && rec) {
          if (rec.id.startsWith("EX-")) {
            onHoverFragment({ title: `${rec.id} · EXHIBIT`, sub: `${rec.setup}\nClick to open.` });
          } else {
            onHoverFragment({
              title: `${rec.id} · ${rec.setup}`,
              sub: `${rec.ts} · ${rec.instrument} · ${rec.r}\n${rec.note}`
            });
          }
        }
      }
    } else {
      if (hovered && hovered !== selected) hovered.material = hovered.userData._matBase || hovered.material;
      hovered = null;
      if (onHoverFragment) onHoverFragment(null);
    }
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // Animate
  let t0 = performance.now();
  function tick(now) {
    t0 = now;

    state.rail = lerp(state.rail, state.railTarget, 0.06);
    state.focus = lerp(state.focus, state.focusTarget, 0.075);

    const px = clamp(state.mouseX, -1, 1);
    const py = clamp(state.mouseY, -1, 1);

    const baseZ = lerp(12.0, -160.0, state.rail);
    const baseX = px * 0.85 + Math.sin(state.rail * Math.PI * 2) * 0.25;
    const baseY = 0.8 + py * 0.30 + Math.cos(state.rail * Math.PI * 1.3) * 0.10;

    const focusZ = state.focusPos.z + 4.4;
    const focusX = state.focusPos.x * 0.55;
    const focusY = state.focusPos.y + 0.2;

    camera.position.x = lerp(baseX, focusX, state.focus);
    camera.position.y = lerp(baseY, focusY, state.focus);
    camera.position.z = lerp(baseZ, focusZ, state.focus);

    const lookZ = lerp(camera.position.z - 18, state.focusPos.z, state.focus);
    camera.lookAt(
      lerp(biasX, state.focusPos.x, state.focus * 0.65),
      lerp(1.6, state.focusPos.y, state.focus),
      lookZ
    );

    if (selected) {
      const a = new THREE.Vector3();
      selected.getWorldPosition(a);
      const b = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z - 6.5);
      leash.geometry.setFromPoints([a, b]);
      leash.material.opacity = lerp(leash.material.opacity, 0.35, 0.12);
    } else {
      leash.material.opacity = lerp(leash.material.opacity, 0.0, 0.10);
    }

    // breathing
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.00025);
    latticeA.material.opacity = 0.10 + pulse * 0.03;
    latticeB.material.opacity = 0.05 + pulse * 0.02;
    for (let i = 0; i < farVolumes.length; i++) {
      const v = farVolumes[i];
      const a = Math.max(0.010, 0.045 - i * 0.006);
      const b = Math.max(0.006, 0.022 - i * 0.004);
      v.la.material.opacity = a + pulse * 0.008;
      v.lb.material.opacity = b + pulse * 0.006;
    }

    updateHover();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  function onPointerMove(e) {
    setPointerFromEvent(e);
    state.mouseX = pointer.x;
    state.mouseY = pointer.y;
  }

  function onClick(e) {
    if (!state.entered) return;

    setPointerFromEvent(e);
    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(frames, false);
    if (!hits.length) {
      clearSelection();
      return;
    }

    const obj = hits[0].object;
    if (!obj.userData.rec) return;

    if (selected === obj) clearSelection();
    else {
      if (selected) clearSelection();
      selectObject(obj);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Escape") clearSelection();
  }

  function getBeaconScreenspace() {
    return beacons.map(b => {
      const v = b.pos.clone().project(camera);
      return {
        id: b.id,
        title: b.title,
        body: b.body,
        x: (v.x * 0.5 + 0.5) * window.innerWidth,
        y: (-v.y * 0.5 + 0.5) * window.innerHeight,
        z: v.z
      };
    });
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("click", onClick, { passive: true });
  window.addEventListener("keydown", onKeyDown);

  resize();
  requestAnimationFrame(tick);

  return {
    setChapter,
    setEntered,
    setRail,
    clearSelection,
    getBeaconScreenspace,
    dispose() {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKeyDown);
      renderer.dispose();
    }
  };
}
