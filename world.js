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

function buildLattice({ size = 220, step = 6, color = 0x22D3EE, opacity = 0.06 } = {}) {
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
  const mat = new THREE.LineBasicMaterial({   color,   transparent: true,   opacity,   blending: THREE.AdditiveBlending });
  return new THREE.LineSegments(geom, mat);
}

function makeFrameGeometry(w, h) {
  return new THREE.PlaneGeometry(w, h, 1, 1);
}

function makeBorderMaterial({ color = 0x22D3EE, opacity = 0.18, thickness = 0.028, glow = 0.55 } = {}) {
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
        float g = pow(e, 1.6) * uGlow;
        float a = (e * uOpacity) + g * 0.25;
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

export function createWorld(canvas, { onHoverFragment, onSelectRecord } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05060a, 0.028);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 620);
  camera.position.set(0, 0.9, 10.5);

  scene.add(new THREE.AmbientLight(0xffffff, 0.78));
  const dir = new THREE.DirectionalLight(0x88ddff, 0.30);
  dir.position.set(6, 10, 6);
  scene.add(dir);

  const latticeA = buildLattice({ size: 240, step: 6,  color: 0x22D3EE, opacity: 0.10 });
  latticeA.position.set(2.4, 2.2, -72); latticeA.rotation.y = 0.08;
  scene.add(latticeA);

  const latticeB = buildLattice({ size: 240, step: 12, color: 0x6D28D9, opacity: 0.05 });
  latticeB.position.copy(latticeA.position); latticeB.rotation.y = latticeA.rotation.y;
  scene.add(latticeB);

  const floor = new THREE.GridHelper(460, 230, 0xffffff, 0xffffff);
  floor.material.opacity = 0.032;
  floor.material.transparent = true;
  floor.position.y = -1.25;
  scene.add(floor);

  // Frames (static)
  const frames = [];
  const frameGroup = new THREE.Group();
  frameGroup.position.set(0, 1.5, -70);
  scene.add(frameGroup);

  const baseBorder = makeBorderMaterial({ opacity: 0.18, thickness: 0.028, glow: 0.55 });
  const hoverBorder = makeBorderMaterial({ opacity: 0.34, thickness: 0.032, glow: 0.85 });

  // faint “plate” behind border so it’s readable at rest
  const plateMat = new THREE.MeshBasicMaterial({ color: 0x070b14, transparent: true, opacity: 0.22 });

  const smallCount = 92;
  for (let i = 0; i < smallCount; i++) {
    const rec = makeRecord(i);
    const w = rand(0.75, 1.45);
    const h = w * rand(0.58, 0.78);

    const border = new THREE.Mesh(makeFrameGeometry(w, h), baseBorder.clone());
    border.userData.rec = rec;

    const plate = new THREE.Mesh(makeFrameGeometry(w * 0.985, h * 0.985), plateMat.clone());
    plate.position.z = -0.001;
    border.add(plate);

    border.position.set(rand(-9.0, 9.0), rand(-2.0, 4.8), rand(-20, 20));
    border.rotation.y = rand(-0.55, 0.55);

    frameGroup.add(border);
    frames.push(border);
  }

  // Exhibits (images)
  const exhibits = [
    { src: "assets/replay.jpg", title: "Replay Engine" },
    { src: "assets/builder.jpg", title: "Strategy Builder" },
    { src: "assets/journal.jpg", title: "Journal + Export" },
  ];

  const exhibitGeo = makeFrameGeometry(5.2, 3.1);
  const exhibitMeshes = [];

  for (let i = 0; i < exhibits.length; i++) {
    const rec = { id: `EX-${i + 1}`, ts: "exhibit", instrument: "JarvQuant", setup: exhibits[i].title, r: "—", note: "A preserved surface of the tool." };

    const border = new THREE.Mesh(exhibitGeo, baseBorder.clone());
    border.userData.rec = rec;

    const plate = new THREE.Mesh(makeFrameGeometry(5.05, 2.95), plateMat.clone());
    plate.position.z = -0.001;

    const inner = new THREE.Mesh(makeFrameGeometry(4.9, 2.8), new THREE.MeshBasicMaterial({ color: 0x0a0f18, transparent: true, opacity: 0.80 }));
    inner.position.z = 0.001;

    border.add(plate);
    border.add(inner);

    border.position.set(-6.8 + i * 6.8, 0.6, -8.5);
    border.rotation.y = rand(-0.16, 0.16);

    frameGroup.add(border);
    frames.push(border);
    exhibitMeshes.push({ border, inner, src: exhibits[i].src });
  }

  (async () => {
    try {
      for (const ex of exhibitMeshes) {
        const tex = await loadTexture(ex.src);
        ex.inner.material = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92 });
      }
    } catch {}
  })();

  // Selection leash (line from selected frame to a point in front of camera)
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
    focus: 0,         // 0 normal, 1 selected zoom
    focusTarget: 0,
    focusPos: new THREE.Vector3(0, 1.6, -30),
  };

  const chapterStops = { threshold: 0.00, memory: 0.32, replay: 0.55, structure: 0.77, edge: 1.00 };

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
    if (onSelectRecord && rec) {
      onSelectRecord({
        title: `${rec.id} · ${rec.instrument} · ${rec.setup}`,
        body: `${rec.ts} · ${rec.r}\n\n${rec.note}`
      });
    }

    // focus point in world space
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
      if (hovered !== obj) {
        if (hovered && hovered !== selected) hovered.material = hovered.userData._matBase || hovered.material;

        hovered = obj;
        if (!obj.userData._matBase) obj.userData._matBase = obj.material;

        if (obj !== selected) obj.material = hoverBorder.clone();

        const rec = obj.userData.rec;
        if (onHoverFragment && rec) {
          onHoverFragment({
            title: `${rec.id} · ${rec.setup}`,
            sub: `${rec.ts} · ${rec.instrument} · ${rec.r}\n${rec.note}`
          });
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

  // --- animate ---
  let t0 = performance.now();
  function tick(now) {
    t0 = now;

    state.rail = lerp(state.rail, state.railTarget, 0.06);
    state.focus = lerp(state.focus, state.focusTarget, 0.075);

    const px = clamp(state.mouseX, -1, 1);
    const py = clamp(state.mouseY, -1, 1);

    // Base path through lattice
    const baseZ = lerp(12.0, -110.0, state.rail);
    const baseX = px * 0.75 + Math.sin(state.rail * Math.PI * 2) * 0.25;
    const baseY = 0.8 + py * 0.28 + Math.cos(state.rail * Math.PI * 1.3) * 0.10;

    // Focus zoom: move camera towards selected object
    const focusZ = state.focusPos.z + 4.2;
    const focusX = state.focusPos.x * 0.55;
    const focusY = state.focusPos.y + 0.2;

    camera.position.x = lerp(baseX, focusX, state.focus);
    camera.position.y = lerp(baseY, focusY, state.focus);
    camera.position.z = lerp(baseZ, focusZ, state.focus);

    // Look target
    const lookZ = lerp(camera.position.z - 18, state.focusPos.z, state.focus);
    const biasX = 1.2; // breaks the central seam
    camera.lookAt(
      lerp(biasX, state.focusPos.x, state.focus * 0.65),
      lerp(1.6, state.focusPos.y, state.focus),
      lookZ
    );

    // Leash line
    if (selected) {
      const a = new THREE.Vector3();
      selected.getWorldPosition(a);
      const b = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z - 6.5);

      leash.geometry.setFromPoints([a, b]);
      leash.material.opacity = lerp(leash.material.opacity, 0.35, 0.12);
    } else {
      leash.material.opacity = lerp(leash.material.opacity, 0.0, 0.10);
    }

    // very restrained breathing
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.00025);
    latticeA.material.opacity = 0.052 + pulse * 0.012;
    latticeB.material.opacity = 0.022 + pulse * 0.007;

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

    // toggle selection
    if (selected === obj) {
      clearSelection();
    } else {
      if (selected) clearSelection();
      selectObject(obj);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Escape") clearSelection();
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
    dispose() {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKeyDown);
      renderer.dispose();
    }
  };
}
