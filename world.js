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

function buildLattice({ size = 180, step = 6, color = 0x22D3EE, opacity = 0.06 } = {}) {
  // 3D lattice: lines along X, Y, Z planes.
  // Use LineSegments to keep it fast.
  const verts = [];
  const half = size / 2;

  // verticals (Y)
  for (let x = -half; x <= half; x += step) {
    for (let z = -half; z <= half; z += step) {
      verts.push(x, -half, z, x, half, z);
    }
  }

  // horizontals X (at several Y slices, fewer to avoid overdraw)
  const yStep = step * 3;
  for (let y = -half; y <= half; y += yStep) {
    for (let z = -half; z <= half; z += step) {
      verts.push(-half, y, z, half, y, z);
    }
  }

  // horizontals Z (at several Y slices)
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
    opacity
  });

  return new THREE.LineSegments(geom, mat);
}

function makeFrameGeometry(w, h) {
  // simple plane; "frame" feeling comes from border shader plane + inner image plane
  return new THREE.PlaneGeometry(w, h, 1, 1);
}

function makeBorderMaterial({ color = 0x22D3EE, opacity = 0.16 } = {}) {
  // Cheap border shader on a plane: draw border lines based on UV.
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uThickness: { value: 0.035 }, // UV thickness
      uGlow: { value: 0.35 },
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
        // glow falloff
        float g = pow(e, 1.8) * uGlow;
        float a = (e * uOpacity) + g * 0.22;
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

export function createWorld(canvas, { onHoverFragment } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05060a, 0.022);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 520);
  camera.position.set(0, 0.9, 10.5);

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const dir = new THREE.DirectionalLight(0x88ddff, 0.28);
  dir.position.set(6, 10, 6);
  scene.add(dir);

  // Lattice layers (JarvQuant version: market coordinate vault)
  const latticeA = buildLattice({ size: 220, step: 6, color: 0x22D3EE, opacity: 0.055 });
  latticeA.position.set(0, 2.5, -70);
  scene.add(latticeA);

  const latticeB = buildLattice({ size: 220, step: 12, color: 0x6D28D9, opacity: 0.028 });
  latticeB.position.copy(latticeA.position);
  scene.add(latticeB);

  // A subtle axis plane near the viewer (so the user immediately reads “space”)
  const floor = new THREE.GridHelper(420, 210, 0xffffff, 0xffffff);
  floor.material.opacity = 0.035;
  floor.material.transparent = true;
  floor.position.y = -1.25;
  scene.add(floor);

  // Memory Frames group (static)
  const frames = [];
  const frameGroup = new THREE.Group();
  frameGroup.position.set(0, 1.5, -70);
  scene.add(frameGroup);

  const borderMatBase = makeBorderMaterial({ color: 0x22D3EE, opacity: 0.12 });
  const borderMatHover = makeBorderMaterial({ color: 0x22D3EE, opacity: 0.28 });
  borderMatHover.uniforms.uGlow.value = 0.62;

  // Create a bunch of small record frames (no textures)
  const smallCount = 84;
  for (let i = 0; i < smallCount; i++) {
    const rec = makeRecord(i);

    const w = rand(0.65, 1.35);
    const h = w * rand(0.55, 0.75);
    const geo = makeFrameGeometry(w, h);

    const border = new THREE.Mesh(geo, borderMatBase.clone());
    border.userData.kind = "record";
    border.userData.rec = rec;

    // Place on a “wall field” inside lattice (static!)
    const x = rand(-8.5, 8.5);
    const y = rand(-2.0, 4.6);
    const z = rand(-18, 18);

    border.position.set(x, y, z);
    border.rotation.y = rand(-0.55, 0.55);

    frameGroup.add(border);
    frames.push(border);
  }

  // Add three large “exhibits” using your existing images
  const exhibits = [
    { src: "assets/replay.jpg", title: "Replay Engine" },
    { src: "assets/builder.jpg", title: "Strategy Builder" },
    { src: "assets/journal.jpg", title: "Journal + Export" },
  ];

  const exhibitMeshes = [];
  const exhibitGeo = makeFrameGeometry(4.8, 2.9);

  // We'll attach textures async; meanwhile show border plates
  for (let i = 0; i < exhibits.length; i++) {
    const rec = {
      id: `EX-${i + 1}`,
      ts: "exhibit",
      instrument: "JarvQuant",
      setup: exhibits[i].title,
      r: "—",
      note: "A preserved surface of the tool."
    };

    const border = new THREE.Mesh(exhibitGeo, borderMatBase.clone());
    border.userData.kind = "exhibit";
    border.userData.rec = rec;

    // Create inner plane for image
    const inner = new THREE.Mesh(
      makeFrameGeometry(4.55, 2.65),
      new THREE.MeshBasicMaterial({ color: 0x0a0f18, transparent: true, opacity: 0.72 })
    );
    inner.position.z = 0.001;

    // Place exhibits in a recognizable “gallery line”
    border.position.set(-6.2 + i * 6.2, 0.6, -7.8);
    border.rotation.y = rand(-0.20, 0.20);

    border.add(inner);

    frameGroup.add(border);
    exhibitMeshes.push({ border, inner, ...exhibits[i] });
    frames.push(border);
  }

  (async () => {
    try {
      for (const ex of exhibitMeshes) {
        const tex = await loadTexture(ex.src);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.88 });
        ex.inner.material = mat;
      }
    } catch {
      // ignore; fallback stays dark plate
    }
  })();

  // Raycast
  const raycaster = new THREE.Raycaster();
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
    chapter: "threshold",
    mouseX: 0,
    mouseY: 0,
    // camera rail progress 0..1 (scroll drives this)
    rail: 0,
    railTarget: 0
  };

  function setEntered(v) { state.entered = !!v; }

  // We map chapters to rail segments (drives camera z and slight x/y)
  const chapterStops = {
    threshold: 0.00,
    memory:    0.32,
    replay:    0.55,
    structure: 0.77,
    edge:      1.00,
  };

  function setChapter(name) {
    state.chapter = name;
    const s = chapterStops[name] ?? 0;
    state.railTarget = s;
  }

  // External scroll driver: setRail(0..1)
  function setRail(t) {
    state.railTarget = clamp(t, 0, 1);
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
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
        // unhover previous
        if (hovered) hovered.material = hovered.userData._matBase;
        hovered = obj;

        // store base material once
        if (!obj.userData._matBase) obj.userData._matBase = obj.material;

        // apply hover material (clone to avoid shared uniforms jitter)
        const hm = borderMatHover.clone();
        obj.material = hm;

        const rec = obj.userData.rec;
        if (onHoverFragment && rec) {
          const title = `${rec.id} · ${rec.setup || rec.title || "Record"}`;
          const sub =
            `${rec.ts}${rec.instrument ? " · " + rec.instrument : ""}${rec.r ? " · " + rec.r : ""}\n` +
            `${rec.note || ""}`;
          onHoverFragment({ title, sub });
        }
      }
    } else {
      if (hovered) {
        hovered.material = hovered.userData._matBase || hovered.material;
        hovered = null;
        if (onHoverFragment) onHoverFragment(null);
      }
    }
  }

  // Animate
  let t0 = performance.now();
  function tick(now) {
    const dt = (now - t0) / 1000;
    t0 = now;

    // ease rail
    state.rail = lerp(state.rail, state.railTarget, 0.06);

    // subtle parallax
    const px = clamp(state.mouseX, -1, 1);
    const py = clamp(state.mouseY, -1, 1);

    // camera path through lattice (“walking” forward)
    // rail 0..1 => z from +12 -> deep negative
    const z = lerp(12.0, -110.0, state.rail);
    const x = px * 0.75 + Math.sin(state.rail * Math.PI * 2) * 0.25;
    const y = 0.8 + py * 0.28 + Math.cos(state.rail * Math.PI * 1.3) * 0.10;

    camera.position.x = lerp(camera.position.x, x, 0.07);
    camera.position.y = lerp(camera.position.y, y, 0.07);
    camera.position.z = lerp(camera.position.z, z, 0.06);

    // look into depth
    camera.lookAt(0, 1.6, camera.position.z - 18);

    // slight “breathing” in lattice opacity (very restrained)
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.00025);
    latticeA.material.opacity = 0.048 + pulse * 0.010;
    latticeB.material.opacity = 0.022 + pulse * 0.006;

    updateHover();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  function onPointerMove(e) {
    setPointerFromEvent(e);
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
    setRail,
    dispose() {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      renderer.dispose();
    }
  };
}
