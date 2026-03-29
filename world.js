import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

function makeRecord(i) {
  const setups = [
    "Liquidity Sweep",
    "Breakout Retest",
    "Compression",
    "Impulse Pullback",
    "Range Fade",
    "Reversion",
  ];
  const instruments = ["ES", "NQ", "DAX", "BTC", "EURUSD", "CL"];
  const notes = [
    "The entry was clean. The hesitation wasn’t.",
    "I saw the level. I ignored the pace.",
    "The market offered structure. I brought noise.",
    "Volatility was the context. Not the excuse.",
    "Edge appeared after I stopped narrating.",
    "The setup repeated. My discipline didn’t.",
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
    note: pick(notes),
  };
}

function buildLattice({ size = 240, step = 6, color = 0x22d3ee, opacity = 0.08 } = {}) {
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
    blending: THREE.AdditiveBlending,
  });

  return new THREE.LineSegments(geom, mat);
}

function makeFrameGeometry(w, h) {
  return new THREE.PlaneGeometry(w, h, 1, 1);
}

function makeBorderMaterial({ color = 0x22d3ee, opacity = 0.2, thickness = 0.028, glow = 0.6 } = {}) {
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
    `,
  });
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        resolve(tex);
      },
      undefined,
      reject
    );
  });
}

// Clear corridor around exhibit wall so random frames don't sit in front of it.
function inGalleryClearZone(x, y, z) {
  return z > -16 && z < -4 && x > -14 && x < 14 && y > -6 && y < 4;
}

// (Legacy) deep clear zone was used to keep a lane free for old manifest plates.
// Manifest plates are gone now, so we disable this to avoid starving mid/deep chapters of cards.
function inDeepClearZone(x, y, z) {
  return false;
}

// Canvas text -> texture (supports basic wrapping + paragraphs)
function makeTextTexture({ title, body, w = 1200, h = 760 }) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  g.clearRect(0, 0, w, h);

  const padX = 62;
  const maxX = w - padX;

  // Title
  g.fillStyle = "rgba(34,211,238,0.90)";
  g.font = "900 46px ui-monospace, Menlo, Consolas, monospace";
  g.fillText(title, padX, 104);

  g.strokeStyle = "rgba(34,211,238,0.18)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(padX, 126);
  g.lineTo(w - padX, 126);
  g.stroke();

  // Body
  g.fillStyle = "rgba(245,247,255,0.80)";
  g.font = "700 28px ui-monospace, Menlo, Consolas, monospace";

  function wrapLine(text) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    const out = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (g.measureText(test).width <= (maxX - padX)) {
        line = test;
      } else {
        if (line) out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
    return out;
  }

  const paras = String(body || "").split("\n");
  let yy = 178;
  const lineH = 42;

  for (const raw of paras) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      yy += lineH * 0.65; // paragraph gap
      continue;
    }
    const lines = wrapLine(line);
    for (const l of lines) {
      g.fillText(l, padX, yy);
      yy += lineH;
      if (yy > h - 42) break;
    }
    yy += 8;
    if (yy > h - 42) break;
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// Mini record texture: chapter-specific micro cards (same design language, different content)
function makeMiniRecordTexture(rec) {
  const { id, instrument, setup, r } = rec;
  const chapter = rec.chapter || "memory";

  const w = 512, h = 320;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");

  g.clearRect(0, 0, w, h);

  // Base glass
  g.fillStyle = "rgba(6, 7, 12, 0.45)";
  g.fillRect(0, 0, w, h);

  // Header
  const accent = chapter === "structure" ? "rgba(109,40,217,0.82)" : "rgba(34,211,238,0.78)";
  g.fillStyle = accent;
  g.font = "900 20px ui-monospace, Menlo, Consolas, monospace";
  g.fillText(id, 18, 34);

  g.fillStyle = "rgba(245,247,255,0.60)";
  g.font = "800 18px ui-monospace, Menlo, Consolas, monospace";
  g.fillText(`${instrument}  ·  ${r}`, 18, 62);

  g.fillStyle = "rgba(245,247,255,0.74)";
  g.font = "800 18px ui-monospace, Menlo, Consolas, monospace";
  g.fillText((setup || "").slice(0, 26), 18, 92);

  const x0 = 18,
    y0 = 118,
    ww = w - 36,
    hh = h - 140;

  // Frame
  g.strokeStyle = "rgba(245,247,255,0.08)";
  g.lineWidth = 1;
  g.strokeRect(x0, y0, ww, hh);

  if (chapter === "edge") {
    // Typography card: one principle line, big whitespace.
    g.fillStyle = "rgba(245,247,255,0.78)";
    g.font = "900 20px ui-monospace, Menlo, Consolas, monospace";
    const s = (rec.note || "").slice(0, 72);
    g.fillText(s, x0, y0 + 40);

    g.fillStyle = "rgba(245,247,255,0.18)";
    g.font = "800 12px ui-monospace, Menlo, Consolas, monospace";
    g.fillText("JARVQUANT / EDGE", x0, y0 + hh - 18);
  } else if (chapter === "structure") {
    // Blueprint card: tiny node graph.
    const nodes = [
      { x: x0 + 54, y: y0 + 46 },
      { x: x0 + ww * 0.42, y: y0 + hh * 0.38 },
      { x: x0 + ww * 0.68, y: y0 + hh * 0.62 },
      { x: x0 + ww - 58, y: y0 + hh * 0.42 },
    ];

    g.strokeStyle = "rgba(109,40,217,0.30)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(nodes[0].x, nodes[0].y);
    for (let i = 1; i < nodes.length; i++) g.lineTo(nodes[i].x, nodes[i].y);
    g.stroke();

    for (let i = 0; i < nodes.length; i++) {
      g.fillStyle = "rgba(109,40,217,0.22)";
      g.beginPath();
      g.arc(nodes[i].x, nodes[i].y, 10, 0, Math.PI * 2);
      g.fill();

      g.strokeStyle = "rgba(245,247,255,0.10)";
      g.lineWidth = 1;
      g.beginPath();
      g.arc(nodes[i].x, nodes[i].y, 10, 0, Math.PI * 2);
      g.stroke();
    }

    g.fillStyle = "rgba(245,247,255,0.52)";
    g.font = "800 13px ui-monospace, Menlo, Consolas, monospace";
    g.fillText((rec.note || "").slice(0, 46), x0, y0 + hh - 22);
  } else if (chapter === "replay") {
    // Test card: equity curve + KPIs row.
    g.strokeStyle = "rgba(34,211,238,0.30)";
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i < 28; i++) {
      const t = i / 27;
      const xx = x0 + t * ww;
      const noise = Math.sin(t * 6.0 + id.length * 0.7) * 0.18 + Math.sin(t * 15.0) * 0.06;
      const yy = y0 + hh * (0.72 - t * 0.34 - noise);
      if (i === 0) g.moveTo(xx, yy);
      else g.lineTo(xx, yy);
    }
    g.stroke();

    g.fillStyle = "rgba(245,247,255,0.55)";
    g.font = "900 12px ui-monospace, Menlo, Consolas, monospace";
    g.fillText("E", x0, y0 + 16);
    g.fillText("DD", x0 + 44, y0 + 16);
    g.fillText("WR", x0 + 96, y0 + 16);

    g.fillStyle = "rgba(245,247,255,0.40)";
    g.font = "800 12px ui-monospace, Menlo, Consolas, monospace";
    g.fillText(`${(rand(-12, 24)).toFixed(1)}R`, x0 + 14, y0 + 16);
    g.fillText(`${(rand(1, 9)).toFixed(1)}R`, x0 + 72, y0 + 16);
    g.fillText(`${(rand(34, 62) | 0)}%`, x0 + 126, y0 + 16);
  } else {
    // Memory default: micro chart + candles (original look)
    g.strokeStyle = "rgba(34,211,238,0.30)";
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i < 22; i++) {
      const t = i / 21;
      const xx = x0 + t * ww;
      const noise =
        Math.sin((t * 6.0 + id.length) * 1.7) * 0.22 + Math.sin(t * 13.0) * 0.10;
      const yy = y0 + hh * (0.55 - noise);
      if (i === 0) g.moveTo(xx, yy);
      else g.lineTo(xx, yy);
    }
    g.stroke();

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
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

  const scene = new THREE.Scene();
  // Slightly brighter / more JarvQuant-tinted atmosphere
  scene.fog = new THREE.FogExp2(0x070a12, 0.022);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1200);
  camera.position.set(0, 0.9, 10.5);

  scene.add(new THREE.AmbientLight(0xffffff, 1.05));
  const dir = new THREE.DirectionalLight(0x88ddff, 0.48);
  dir.position.set(6, 10, 6);
  scene.add(dir);

  const floor = new THREE.GridHelper(900, 320, 0xffffff, 0xffffff);
  floor.material.opacity = 0.045;
  floor.material.transparent = true;
  floor.position.y = -1.25;
  scene.add(floor);

  // Lattice (aligned to corridor)
  // Keep it centered + no yaw so the camera flight reads dead-straight.
  const origin = new THREE.Vector3(0.0, 2.2, -72);
  const yaw = 0.0;

  const latticeA = buildLattice({ size: 260, step: 6, color: 0x22d3ee, opacity: 0.12 });
  latticeA.position.copy(origin);
  latticeA.rotation.y = yaw;
  scene.add(latticeA);

  const latticeB = buildLattice({ size: 260, step: 12, color: 0x6d28d9, opacity: 0.06 });
  latticeB.position.copy(origin);
  latticeB.position.x += 0.35; // seam fix
  latticeB.rotation.y = yaw;
  scene.add(latticeB);

  const farVolumes = [];
  for (let k = 0; k < 6; k++) {
    const la = buildLattice({
      size: 320 + k * 70,
      step: 6,
      color: 0x22d3ee,
      opacity: 0.060 - k * 0.006,
    });
    const lb = buildLattice({
      size: 320 + k * 70,
      step: 12,
      color: 0x6d28d9,
      opacity: 0.032 - k * 0.004,
    });

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

  // IMPORTANT: many surfaces are transparent. If any of them write depth, you get flicker / disappearing text.
  // Keep depthWrite disabled on plates/text to stabilize render order.
  const plateMat = new THREE.MeshBasicMaterial({
    color: 0x070b14,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  });

  // --- 3D Info plates (segmented windows; left pulled slightly inward) ---
  const infoPlates = [];

  // Pull both rails slightly toward center to reduce edge clipping / overlaps in perspective.
  const XR = 8.6;
  const XL = -7.6;

  const reserved = [];

  function inReservedZone(x, y, z) {
    for (const r of reserved) {
      const dx = x - r.x;
      const dy = y - r.y;
      const dz = z - r.z;
      if (dx * dx + dy * dy + dz * dz < r.r * r.r) return true;
    }
    return false;
  }

  const info = [
    // Threshold / intro (brand)
    // Push the first plate further behind the exhibit wall so it doesn't get occluded by the 6 big exhibit frames.
    {
      id: "IP-0A",
      title: "[JARVQUANT]",
      body:
        "JarvQuant is a replay-first archive of market memory.\n\n" +
        "It’s built for traders who want evidence — not vibes.\n" +
        "You capture decisions, reconstruct conditions, and turn repetition into structure.\n\n" +
        "The goal is simple: preserve the moment before hindsight, then learn from it on purpose.",
      x: XL,
      y: 1.75,
      z: -44,
      ry: 0.30,
      a: 0.00,
      b: 0.22,
    },
    {
      id: "IP-0B",
      title: "[WHY]",
      body:
        "Most trading logs store outcomes. JarvQuant stores context.\n\n" +
        "Replay is the core: it lets you revisit price action, spreads, execution assumptions, and your own intent — as if it’s happening again.\n\n" +
        "Over time, the archive becomes your personal dataset of what actually worked for you.",
      x: XR,
      y: 1.55,
      z: -58,
      ry: -0.30,
      a: 0.00,
      b: 0.22,
    },

    // MEMORY
    {
      id: "IP-1A",
      title: "[MEMORY]",
      body:
        "Memory is not a folder — it’s a system.\n\n" +
        "JarvQuant captures fragments: trades, screenshots, notes, and the subtle signals you noticed (or missed).\n" +
        "Then it makes them searchable, revisit-able, and exportable — so learning compounds.",
      x: XR,
      y: 1.65,
      z: -72,
      ry: -0.26,
      a: 0.10,
      b: 0.44,
    },
    {
      id: "IP-1B",
      title: "[JOURNAL]",
      body:
        "Write the why — not just the what.\n\n" +
        "A journal entry links your idea to evidence: context, execution, and post-trade reflection.\n" +
        "Export turns memory into something you can share, review, and improve.",
      x: XL,
      y: 1.35,
      z: -92,
      ry: 0.26,
      a: 0.10,
      b: 0.44,
    },

    // REPLAY
    {
      id: "IP-2A",
      title: "[REPLAY]",
      body:
        "Replay is a controlled return to the past.\n\n" +
        "You can step, scrub, and re-run the same scenario — while accounting for spread, slippage, and fees.\n" +
        "The point is not entertainment. It’s to train decision-making under real constraints.",
      x: XL,
      y: 1.55,
      z: -124,
      ry: 0.28,
      a: 0.36,
      b: 0.68,
    },
    {
      id: "IP-2B",
      title: "[TESTS]",
      body:
        "Small tests beat big opinions.\n\n" +
        "Try micro-variations: different entries, invalidations, risk models.\n" +
        "Compare outcomes in the same market slice — then keep what survives costs.",
      x: XR,
      y: 1.75,
      z: -144,
      ry: -0.28,
      a: 0.36,
      b: 0.68,
    },

    // STRUCTURE
    {
      id: "IP-3A",
      title: "[STRUCTURE]",
      body:
        "Structure is what remains when motivation fades.\n\n" +
        "JarvQuant helps you turn patterns into rules: entries, exits, filters, and constraints.\n" +
        "Validation blocks bad runs early — so you iterate with clarity, not hope.",
      x: XR,
      y: 1.75,
      z: -198,
      ry: -0.28,
      a: 0.62,
      b: 0.90,
    },
    {
      id: "IP-3B",
      title: "[PRESETS]",
      body:
        "Presets are experiments you can repeat.\n\n" +
        "Save assumptions, execution settings, and constraints — then re-run safely.\n" +
        "The archive keeps comparisons clean: same inputs, clear deltas.",
      x: XL,
      y: 1.45,
      z: -220,
      ry: 0.28,
      a: 0.62,
      b: 0.90,
    },

    // EDGE
    {
      id: "IP-4A",
      title: "[EDGE]",
      body:
        "Edge is not a secret indicator.\n\n" +
        "It’s a disciplined loop: capture → replay → test → structure.\n" +
        "When you can prove your process, confidence stops being a mood.",
      x: XL,
      y: 1.65,
      z: -276,
      ry: 0.28,
      a: 0.84,
      b: 1.00,
    },
    {
      id: "IP-4B",
      title: "[ACCESS]",
      body:
        "JarvQuant is currently internal.\n\n" +
        "Public beta is planned at v0.5.0 (limited invites).\n" +
        "Discord is the primary path to invites and drops.",
      x: XR,
      y: 1.45,
      z: -296,
      ry: -0.28,
      a: 0.84,
      b: 1.00,
    },
  ];

  for (const it of info) {
    const tex = makeTextTexture({ title: it.title, body: it.body });
    // Disable fog on text so plates stay readable deeper into the corridor.
    // depthWrite:false avoids flicker with other transparent surfaces.
    const innerMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      // Always visible (no fade-in/out)
      opacity: 0.92,
      fog: false,
      depthWrite: false,
      // Let text draw on top of its own card (avoid z-fighting / flicker).
      depthTest: false,
    });

    const w = 6.4, h = 3.85;
    const border = new THREE.Mesh(makeFrameGeometry(w, h), baseBorder.clone());
    border.userData.rec = {
      id: it.id,
      ts: "info",
      instrument: "JarvQuant",
      setup: it.title,
      r: "—",
      note: it.body,
    };

    // Larger Z separation + explicit renderOrder to avoid z-fighting / flicker.
    const plate = new THREE.Mesh(makeFrameGeometry(w * 0.985, h * 0.985), plateMat.clone());
    plate.position.z = -0.010;
    plate.renderOrder = 1;

    const inner = new THREE.Mesh(makeFrameGeometry(w * 0.95, h * 0.95), innerMat);
    inner.position.z = 0.010;
    inner.renderOrder = 3;

    border.add(plate);
    border.add(inner);

    border.position.set(it.x, it.y, it.z);
    border.rotation.y = it.ry;

    // Keep a clear bubble around big text plates so random frames never overlap them.
    // (Radius is generous to avoid the "double panel" overlap issue.)
    reserved.push({ x: it.x, y: it.y, z: it.z, r: 6.4 });

    frameGroup.add(border);
    frames.push(border);
    infoPlates.push(border);
  }

  // --- Random record frames (chapter-biased scatter) ---
  // Goal: cards may appear anywhere, but each chapter has a visible "density peak" around its center.
  // Implementation: mixture distribution (mostly chapter-centered normal samples + some global uniform scatter).
  const zMin = -360;
  const zMax = 96;

  const chapterDefs = {
    memory: { centerZ: -78, sigma: 28 },
    replay: { centerZ: -138, sigma: 34 },
    structure: { centerZ: -198, sigma: 38 },
    edge: { centerZ: -260, sigma: 42 },
  };

  const edgeQuotes = [
    "Evidence > vibes.",
    "Replay until it’s boring.",
    "Constraints create edge.",
    "Measure the spread. Pay the tax.",
    "If you can’t journal it, you can’t scale it.",
  ];

  const structureBlueprints = [
    "Risk model: max loss/day, max concurrent risk.",
    "Position sizing: instrument-aware constraints.",
    "Filters: session, volatility, regime.",
    "Workflow: import → normalize → validate → replay.",
    "Rulesets: entry/exit, invalidation, cooldown.",
  ];

  const replayTests = [
    "Micro-test: n=20 trades. Find failure modes.",
    "Parameter sweep: slippage, fees, spread.",
    "A/B run: one rule tweak, same slice.",
    "Intrabar check: what breaks first?",
    "Edge check: survives costs + latency?",
  ];

  function randn() {
    // Box–Muller
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  function chooseChapterTag() {
    // balanced-ish. tweak later if we want more of one type.
    const r = Math.random();
    if (r < 0.28) return "memory";
    if (r < 0.54) return "replay";
    if (r < 0.78) return "structure";
    return "edge";
  }

  function sampleChapterZ(tag) {
    const c = chapterDefs[tag];
    // Try a few times to stay within bounds; otherwise clamp.
    for (let k = 0; k < 12; k++) {
      const z = c.centerZ + randn() * c.sigma;
      if (z >= zMin && z <= zMax) return z;
    }
    return clamp(c.centerZ + randn() * c.sigma, zMin, zMax);
  }

  function sampleZ(tag) {
    // 22% global scatter, 78% chapter peak
    if (Math.random() < 0.22) return rand(zMin, zMax);
    return sampleChapterZ(tag);
  }

  function applyChapterFlavor(rec, tag, idx) {
    rec.chapter = tag;

    if (tag === "replay") {
      rec.id = `RP-${String(idx + 1).padStart(4, "0")}`;
      rec.ts = "TEST";
      rec.instrument = "Replay";
      rec.setup = "Strategy Test";
      rec.r = "n=20";
      rec.note = replayTests[(Math.random() * replayTests.length) | 0];
    } else if (tag === "structure") {
      rec.id = `ST-${String(idx + 1).padStart(4, "0")}`;
      rec.ts = "BLUEPRINT";
      rec.instrument = "Structure";
      rec.setup = "Blueprint";
      rec.r = "rules";
      rec.note = structureBlueprints[(Math.random() * structureBlueprints.length) | 0];
    } else if (tag === "edge") {
      rec.id = `ED-${String(idx + 1).padStart(4, "0")}`;
      rec.ts = "PRINCIPLE";
      rec.instrument = "Edge";
      rec.setup = "Principle";
      rec.r = "—";
      rec.note = edgeQuotes[(Math.random() * edgeQuotes.length) | 0];
    } else {
      // memory: keep as trade-like record
      rec.instrument = rec.instrument || "Memory";
    }
  }

  const smallCount = 320;
  for (let i = 0; i < smallCount; i++) {
    const tag = chooseChapterTag();
    const rec = makeRecord(i);
    applyChapterFlavor(rec, tag, i);

    const w = rand(0.55, 1.35);
    const h = w * rand(0.55, 0.80);

    const border = new THREE.Mesh(makeFrameGeometry(w, h), baseBorder.clone());
    border.userData.rec = rec;

    const plate = new THREE.Mesh(makeFrameGeometry(w * 0.985, h * 0.985), plateMat.clone());
    plate.position.z = -0.001;
    border.add(plate);

    const chance = 0.84;
    if (Math.random() < chance) {
      const tex = makeMiniRecordTexture(rec);
      const inner = new THREE.Mesh(
        makeFrameGeometry(w * 0.95, h * 0.95),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.82, depthWrite: false })
      );
      inner.position.z = 0.001;
      border.add(inner);
    }

    let x, y, z;
    for (let tries = 0; tries < 60; tries++) {
      x = rand(-12.5, 12.5);
      y = rand(-2.4, 5.6);
      z = sampleZ(tag);
      if (!inGalleryClearZone(x, y, z) && !inDeepClearZone(x, y, z) && !inReservedZone(x, y, z)) break;
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
    const rec = {
      id: `EX-${i + 1}`,
      ts: "exhibit",
      instrument: "JarvQuant",
      setup: exhibits[i].title,
      r: "—",
      note: "Exhibit plate.",
    };

    const border = new THREE.Mesh(exhibitGeo, baseBorder.clone());
    border.userData.rec = rec;

    const plate = new THREE.Mesh(makeFrameGeometry(5.22, 3.05), plateMat.clone());
    plate.position.z = -0.001;

    const inner = new THREE.Mesh(
      makeFrameGeometry(5.05, 2.92),
      new THREE.MeshBasicMaterial({ color: 0x0a0f18, transparent: true, opacity: 0.90, depthWrite: false })
    );
    inner.position.z = 0.001;

    border.add(plate);
    border.add(inner);

    const row = (i / 3) | 0;
    const col = i % 3;

    // Keep the exhibit wall orthogonal (no yaw). Widen spacing a touch to avoid screen-space overlap.
    border.position.set(-8.2 + col * 8.2, 1.15 - row * 4.1, -9.2);
    border.rotation.y = 0.0;

    reserved.push({ x: border.position.x, y: border.position.y, z: border.position.z, r: 7.2 });

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

  // (Manifest plates removed — keep all information in in-world cards only.)

  // Selection leash
  const leashMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.0 });
  const leash = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    leashMat
  );
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

    // selection focus helpers
    focusMode: "point", // "point" | "plate"
    focusPlateW: 0,
    focusPlateH: 0,
    focusPlateNormal: new THREE.Vector3(0, 0, 1),
  };

  // camera: neutral (no right bias)
  const biasX = 0.0;

  function setEntered(v) { state.entered = !!v; }
  function setChapter(name) { state.chapter = name; }
  function setRail(t) { state.railTarget = clamp(t, 0, 1); }

  function clearSelection() {
    if (!selected) return;
    selected.material = selected.userData._matBase || selected.material;
    selected = null;
    state.focusTarget = 0;
    state.focusMode = "point";
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
          body: `${rec.ts} · ${rec.r}\n\n${rec.note}`,
        });
      } else {
        onSelectRecord(null);
      }
    }

    // Store focus target position
    obj.getWorldPosition(state.focusPos);

    // If it's an info plate, compute a camera framing target so the full plate fits on screen.
    if (rec?.id?.startsWith("IP-") && obj.geometry?.parameters) {
      state.focusMode = "plate";
      state.focusPlateW = obj.geometry.parameters.width || 6.4;
      state.focusPlateH = obj.geometry.parameters.height || 3.85;

      const q = new THREE.Quaternion();
      obj.getWorldQuaternion(q);
      state.focusPlateNormal.set(0, 0, 1).applyQuaternion(q).normalize();
    } else {
      state.focusMode = "point";
    }
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
          // MF-* manifest plates removed
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

    // Info plates: always visible (no rail-window fade / flicker).
    for (const p of infoPlates) {
      p.material.uniforms.uOpacity.value = 0.38;
      p.material.uniforms.uGlow.value = 0.95;
    }

    const px = clamp(state.mouseX, -1, 1);
    const py = clamp(state.mouseY, -1, 1);

    // extended runway
    // Keep the default flight path dead-straight (no diagonal drift / yaw bias).
    // We still allow a tiny vertical parallax so it doesn't feel "on rails".
    const baseZ = lerp(12.0, -420.0, state.rail);
    const baseX = 0.0;
    const baseY = 0.8 + py * 0.22 + Math.cos(state.rail * Math.PI * 1.3) * 0.08;

    // Focus handling
    let focusX = state.focusPos.x * 0.55;
    let focusY = state.focusPos.y + 0.2;
    let focusZ = state.focusPos.z + 4.4;

    // For info plates, frame the whole plate in view (avoid half-cut panels).
    if (selected && state.focusMode === "plate") {
      const vFov = (camera.fov * Math.PI) / 180;
      const aspect = camera.aspect;
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);

      const wHalf = state.focusPlateW * 0.5;
      const hHalf = state.focusPlateH * 0.5;

      // Distance required to fit width/height in view
      const distH = hHalf / Math.tan(vFov / 2);
      const distW = wHalf / Math.tan(hFov / 2);
      const dist = Math.max(distH, distW) * 1.18; // margin

      const pos = state.focusPos;
      const n = state.focusPlateNormal;

      // camera target in front of plate
      focusX = pos.x + n.x * dist;
      focusY = pos.y + n.y * dist;
      focusZ = pos.z + n.z * dist;
    }

    camera.position.x = lerp(baseX, focusX, state.focus);
    camera.position.y = lerp(baseY, focusY, state.focus);
    camera.position.z = lerp(baseZ, focusZ, state.focus);

    if (selected && state.focusMode === "plate") {
      camera.lookAt(state.focusPos);
    } else {
      const lookZ = lerp(camera.position.z - 18, state.focusPos.z, state.focus);
      camera.lookAt(
        lerp(0.0, state.focusPos.x, state.focus * 0.65),
        lerp(1.6, state.focusPos.y, state.focus),
        lookZ
      );
    }

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
      const a = Math.max(0.008, 0.045 - i * 0.006);
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
    },
  };
}
