import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

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
  const days = (rand(3, 320) | 0);
  const hh = String(rand(6, 22) | 0).padStart(2, "0");
  const mm = String(rand(0, 59) | 0).padStart(2, "0");
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

// Clear corridor around exhibit wall so random frames don't sit in front of it.
function inGalleryClearZone(x, y, z) {
  return (z > -16 && z < -4) && (x > -14 && x < 14) && (y > -6 && y < 4);
}

// Canvas text -> texture
function makeTextTexture({ title, body, w = 1024, h = 640 }) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.clearRect(0, 0, w, h);

  g.fillStyle = "rgba(34,211,238,0.85)";
  g.font = "900 44px ui-monospace, Menlo, Consolas, monospace";
  g.fillText(title, 56, 96);

  g.strokeStyle = "rgba(34,211,238,0.18)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(56, 116);
  g.lineTo(w - 56, 116);
  g.stroke();

  g.fillStyle = "rgba(245,247,255,0.78)";
  g.font = "700 30px ui-monospace, Menlo, Consolas, monospace";

  const lines = body.split("\n");
  let yy = 160;
  for (const line of lines) {
    g.fillText(line, 56, yy);
    yy += 44;
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// Mini record texture: tiny label + micro chart
function makeMiniRecordTexture({ id, instrument, setup, r, w = 512, h = 320 }) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");

  // translucent surface
  g.clearRect(0, 0, w, h);
  g.fillStyle = "rgba(6, 7, 12, 0.45)";
  g.fillRect(0, 0, w, h);

  // header line
  g.fillStyle = "rgba(34,211,238,0.78)";
  g.font = "900 20px ui-monospace, Menlo, Consolas, monospace";
  g.fillText(id, 18, 34);

  g.fillStyle = "rgba(245,247,255,0.60)";
  g.font = "800 18px ui-monospace, Menlo, Consolas, monospace";
  g.fillText(`${instrument}  ·  ${r}`, 18, 62);

  g.fillStyle = "rgba(245,247,255,0.72)";
  g.font = "800 18px ui-monospace, Menlo, Consolas, monospace";
  const s = (setup || "").slice(0, 26);
  g.fillText(s, 18, 92);

  // micro chart area
  const x0 = 18, y0 = 118, ww = w - 36, hh = h - 140;
  g.strokeStyle = "rgba(245,247,255,0.08)";
  g.lineWidth = 1;
  g.strokeRect(x0, y0, ww, hh);

  // sparkline
  g.strokeStyle = "rgba(34,211,238,0.28)";
  g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i < 22; i++) {
    const t = i / 21;
    const xx = x0 + t * ww;
    const noise = Math.sin((t * 6.0 + id.length) * 1.7) * 0.22 + Math.sin(t * 13.0) * 0.10;
    const yy = y0 + hh * (0.55 - noise);
    if (i === 0) g.moveTo(xx, yy);
    else g.lineTo(xx, yy);
  }
  g.stroke();

  // a few candle-ish marks (subtle)
  for (let k = 0; k < 8; k++) {
    const t = (k + 1) / 9;
    const xx = x0 + t * ww;
    const base = y0 + hh * (0.55 + Math.sin(t * 8.0) * 0.08);
    const wick = 18 + (k % 3) * 6;
    const body = 10 + (k % 4) * 4;

    g.strokeStyle = "rgba(245,247,255,0.12)";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(xx, base - wick);
    g.lineTo(xx, base + wick);
    g.stroke();

    g.fillStyle = "rgba(109,40,217,0.18)";
    g.fillRect(xx - 3, base - body, 6, body * 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function createWorld(canvas, { onHoverFragment, onSelectRecord } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
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

  // Lattice (off-center)
  const origin = new THREE.Vector3(2.4, 2.2, -72);
  const yaw = 0.08;

  const latticeA = buildLattice({ size: 260, step: 6, color: 0x22D3EE, opacity: 0.12 });
  latticeA.position.copy(origin);
  latticeA.rotation.y = yaw;
  scene.add(latticeA);

  const latticeB = buildLattice({ size: 260, step: 12, color: 0x6D28D9, opacity: 0.06 });
  latticeB.position.copy(origin);
  latticeB.rotation.y = yaw;
  scene.add(latticeB);

  const farVolumes = [];
  for (let k = 0; k < 4; k++) {
    const la = buildLattice({ size: 320 + k * 70, step: 6, color: 0x22D3EE, opacity: 0.060 - k * 0.006 });
    const lb = buildLattice({ size: 320 + k * 70, step: 12, color: 0x6D28D9, opacity: 0.032 - k * 0.004 });

    la.position.set(origin.x, origin.y, origin.z - (k + 1) * 110);
    lb.position.copy(la.position);

    la.rotation.y = yaw + k * 0.01;
    lb.rotation.y = la.rotation.y;

    scene.add(la);
    scene.add(lb);
    farVolumes.push({ la, lb });
  }

  // Frame group
  const frames = [];
  const frameGroup = new THREE.Group();
  frameGroup.position.set(0, 1.5, -70);
  scene.add(frameGroup);

  const baseBorder = makeBorderMaterial({ opacity: 0.22, thickness: 0.028, glow: 0.65 });
  const hoverBorder = makeBorderMaterial({ opacity: 0.38, thickness: 0.032, glow: 0.95 });
  const plateMat = new THREE.MeshBasicMaterial({ color: 0x070b14, transparent: true, opacity: 0.24 });

  // --- 3D Info plates (multiple per chapter window) ---
  const infoPlates = [];
  const info = [
    // threshold -> memory transition
    { id: "IP-0", title: "[JARVQUANT]", body: "Private internal builds.\nBeta planned at v0.5.0.", x: -10.6, y: 1.55, z: -22, ry: 0.30, a: 0.00, b: 0.22 },
    { id: "IP-1", title: "[MEMORY]", body: "Capture context.\nRetrieve patterns.\nRepeat what works.", x: 9.8, y: 1.5, z: -26, ry: -0.26, a: 0.18, b: 0.47 },
    { id: "IP-1B", title: "[MEMORY]", body: "From notes to evidence.\nNot vibes.", x: -8.8, y: 0.95, z: -34, ry: 0.24, a: 0.22, b: 0.47 },

    // memory -> replay
    { id: "IP-2", title: "[REPLAY]", body: "Reconstruct the moment.\nBefore hindsight.", x: -10.2, y: 1.2, z: -58, ry: 0.28, a: 0.47, b: 0.66 },
    { id: "IP-2B", title: "[EXECUTION]", body: "Spread • fees • slippage\n(iterating)", x: 10.4, y: 1.55, z: -66, ry: -0.26, a: 0.47, b: 0.66 },

    // replay -> structure
    { id: "IP-3", title: "[STRUCTURE]", body: "Rules.\nConstraints.\nValidation.", x: 10.2, y: 1.6, z: -94, ry: -0.28, a: 0.66, b: 0.88 },
    { id: "IP-3B", title: "[PRESETS]", body: "Repeat experiments.\nClean comparisons.", x: -10.1, y: 1.25, z: -102, ry: 0.28, a: 0.66, b: 0.88 },

    // structure -> edge
    { id: "IP-4", title: "[ACCESS]", body: "Discord + socials\nfor drops.", x: -9.2, y: 1.3, z: -132, ry: 0.28, a: 0.88, b: 1.00 },
    { id: "IP-4B", title: "[REQUEST]", body: "Email with your use-case\nfor invites.", x: 9.8, y: 1.55, z: -140, ry: -0.28, a: 0.88, b: 1.00 },
  ];

  for (const it of info) {
    const tex = makeTextTexture({ title: it.title, body: it.body, w: 900, h: 520 });
    const innerMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.0 });

    const w = 4.6, h = 2.9;
    const border = new THREE.Mesh(makeFrameGeometry(w, h), baseBorder.clone());
    border.userData.rec = {
      id: it.id,
      ts: "info",
      instrument: "JarvQuant",
      setup: it.title,
      r: "—",
      note: it.body.replace(/\n/g, " ")
    };

    const plate = new THREE.Mesh(makeFrameGeometry(w * 0.985, h * 0.985), plateMat.clone());
    plate.position.z = -0.001;

    const inner = new THREE.Mesh(makeFrameGeometry(w * 0.95, h * 0.95), innerMat);
    inner.position.z = 0.001;

    border.add(plate);
    border.add(inner);

    border.position.set(it.x, it.y, it.z);
    border.rotation.y = it.ry;

    border.userData.fade = { a: it.a, b: it.b, innerMat };

    frameGroup.add(border);
    frames.push(border);
    infoPlates.push(border);
  }

  // --- Random record frames (now: many have subtle mini content) ---
  const smallCount = 280;
  for (let i = 0; i < smallCount; i++) {
    const rec = makeRecord(i);
    const w = rand(0.55, 1.35);
    const h = w * rand(0.55, 0.80);

    const border = new THREE.Mesh(makeFrameGeometry(w, h), baseBorder.clone());
    border.userData.rec = rec;

    const plate = new THREE.Mesh(makeFrameGeometry(w * 0.985, h * 0.985), plateMat.clone());
    plate.position.z = -0.001;
    border.add(plate);

    // Add a mini inner texture to a subset (keeps scene light but richer)
    const chance = 0.38; // 38% of small frames get content
    if (Math.random() < chance) {
      const tex = makeMiniRecordTexture(rec);
      const inner = new THREE.Mesh(
        makeFrameGeometry(w * 0.95, h * 0.95),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.75 })
      );
      inner.position.z = 0.001;
      border.add(inner);
    }

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

  // --- Exhibits (6) ---
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

    const row = (i / 3) | 0;
    const col = i % 3;
    border.position.set(-7.4 + col * 7.4, 1.15 - row * 4.1, -9.2);
    border.rotation.y = rand(-0.10, 0.10);

    frameGroup.add(border);
    frames.push(border);
    exhibitMeshes.push({ inner, src: exhibits[i].src });
  }

  (async () => {
    try {
      for (const ex of exhibitMeshes) {
        const tex = await loadTexture(ex.src);
        ex.inner.material = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.96 });
      }
    } catch {}
  })();

  // --- Manifest plates AFTER the gallery (now: more JarvQuant branding) ---
  const manifest = [
    { id: "MF-1", title: "[JARVQUANT]", body: "Replay-first archive of market memory.\nEvidence over hype." },
    { id: "MF-2", title: "[MISSION]", body: "Preserve decisions.\nReconstruct markets.\nTurn memory into structure." },
    { id: "MF-3", title: "[STATUS]", body: "Internal v0.3.0.\nBeta planned at v0.5.0." },
    { id: "MF-4", title: "[LINKS]", body: "discord.gg/fYWSz2NpaC\nx.com/JarvQuant\nyoutube.com/@JarvQuant" },
  ];

  for (let i = 0; i < manifest.length; i++) {
    const tex = makeTextTexture({ title: manifest[i].title, body: manifest[i].body });
    const innerMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.96 });

    const w = 6.2, h = 3.9;
    const border = new THREE.Mesh(makeFrameGeometry(w, h), baseBorder.clone());
    border.userData.rec = {
      id: manifest[i].id,
      ts: "manifest",
      instrument: "JarvQuant",
      setup: manifest[i].title,
      r: "—",
      note: manifest[i].body.replace(/\n/g, " ")
    };

    const plate = new THREE.Mesh(makeFrameGeometry(w * 0.985, h * 0.985), plateMat.clone());
    plate.position.z = -0.001;

    const inner = new THREE.Mesh(makeFrameGeometry(w * 0.95, h * 0.95), innerMat);
    inner.position.z = 0.001;

    border.add(plate);
    border.add(inner);

    const x = (i % 2 === 0) ? -10.5 : 10.5;
    const y = 1.8 - (i * 0.6);
    const z = -42 - (i * 18);
    border.position.set(x, y, z);
    border.rotation.y = (i % 2 === 0) ? 0.30 : -0.30;

    frameGroup.add(border);
    frames.push(border);
  }

  // Selection leash
  const leashMat = new THREE.LineBasicMaterial({ color: 0x22D3EE, transparent: true, opacity: 0.0 });
  const leash = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), leashMat);
  scene.add(leash);

  // Raycast
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(0, 0);

  let hovered = null;
  let selected = null;

  function setPointerFromEvent(e) {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
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

  const biasX = 1.2;

  function setEntered(v) { state.entered = !!v; }
  function setChapter(name) { state.chapter = name; }
  function setRail(t) { state.railTarget = clamp(t, 0, 1); }

  function clearSelection() {
    if (!selected) return;
    selected.material = selected.userData._matBase || selected.material;
    selected = null;
    state.focusTarget = 0;
    if (onSelectRecord) onSelectRecord(null);
  }

  function selectObject(obj) {
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
      const rec = obj.userData.rec;

      if (!rec) {
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

        if (onHoverFragment) {
          if (rec.id.startsWith("EX-")) onHoverFragment({ title: `${rec.id} · EXHIBIT`, sub: `${rec.setup}\nClick to open.` });
          else if (rec.id.startsWith("MF-")) onHoverFragment({ title: `${rec.id} · MANIFEST`, sub: `${rec.setup}\nClick to read.` });
          else if (rec.id.startsWith("IP-")) onHoverFragment({ title: `${rec.id} · SYSTEM`, sub: `${rec.setup}\nClick to read.` });
          else onHoverFragment({ title: `${rec.id} · ${rec.setup}`, sub: `${rec.ts} · ${rec.instrument} · ${rec.r}\n${rec.note}` });
        }
      }
    } else {
      if (hovered && hovered !== selected) hovered.material = hovered.userData._matBase || hovered.material;
      hovered = null;
      if (onHoverFragment) onHoverFragment(null);
    }
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function tick(now) {
    state.rail = lerp(state.rail, state.railTarget, 0.06);
    state.focus = lerp(state.focus, state.focusTarget, 0.055);

    // Fade info plates by rail window
    for (const p of infoPlates) {
      const f = p.userData.fade;
      if (!f) continue;

      const t = state.rail;
      const inT = clamp((t - f.a) / 0.06, 0, 1);
      const outT = clamp((f.b - t) / 0.06, 0, 1);
      const vis = Math.min(inT, outT);

      f.innerMat.opacity = 0.92 * vis;
      p.material.uniforms.uOpacity.value = 0.22 + 0.16 * vis;
      p.material.uniforms.uGlow.value = 0.65 + 0.25 * vis;
    }

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
      const a = new THREE.Vector3(); selected.getWorldPosition(a);
      const b = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z - 6.5);
      leash.geometry.setFromPoints([a, b]);
      leash.material.opacity = lerp(leash.material.opacity, 0.35, 0.12);
    } else {
      leash.material.opacity = lerp(leash.material.opacity, 0.0, 0.10);
    }

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
    if (!hits.length) { clearSelection(); return; }

    const obj = hits[0].object;
    if (!obj.userData.rec) return;

    if (selected === obj) clearSelection();
    else { if (selected) clearSelection(); selectObject(obj); }
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
    getBeaconScreenspace() { return []; },
    dispose() {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKeyDown);
      renderer.dispose();
    }
  };
}
