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

  // Base glass — much more opaque so text reads at distance
  const bgGrad = g.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, "rgba(8, 12, 22, 0.92)");
  bgGrad.addColorStop(1, "rgba(4, 6, 14, 0.88)");
  g.fillStyle = bgGrad;
  g.fillRect(0, 0, w, h);

  // Top accent strip — chapter color tag
  const accent = chapter === "structure" ? "rgba(255,200,120,0.92)"
              : chapter === "replay"    ? "rgba(255,158,212,0.92)"
              : chapter === "edge"      ? "rgba(255,210,138,0.95)"
              :                            "rgba(120,238,255,0.92)";
  g.fillStyle = accent;
  g.fillRect(0, 0, w, 4);

  // Header — bigger, brighter
  g.fillStyle = accent;
  g.font = "900 24px ui-monospace, Menlo, Consolas, monospace";
  g.fillText(id, 20, 42);

  g.fillStyle = "rgba(220,232,255,0.85)";
  g.font = "800 20px ui-monospace, Menlo, Consolas, monospace";
  g.fillText(`${instrument}  ·  ${r}`, 20, 72);

  g.fillStyle = "rgba(245,247,255,0.96)";
  g.font = "800 20px ui-monospace, Menlo, Consolas, monospace";
  g.fillText((setup || "").slice(0, 26), 20, 104);

  const x0 = 18,
    y0 = 118,
    ww = w - 36,
    hh = h - 140;

  // Frame
  g.strokeStyle = "rgba(245,247,255,0.16)";
  g.lineWidth = 1;
  g.strokeRect(x0, y0, ww, hh);

  if (chapter === "edge") {
    // Typography card: one principle line, big whitespace.
    g.fillStyle = "rgba(255,238,210,0.95)";
    g.font = "900 22px ui-monospace, Menlo, Consolas, monospace";
    const s = (rec.note || "").slice(0, 72);
    g.fillText(s, x0 + 6, y0 + 44);

    g.fillStyle = "rgba(255,210,138,0.55)";
    g.font = "800 13px ui-monospace, Menlo, Consolas, monospace";
    g.fillText("JARVQUANT / EDGE", x0 + 6, y0 + hh - 18);
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

    g.fillStyle = "rgba(245,247,255,0.85)";
    g.font = "800 14px ui-monospace, Menlo, Consolas, monospace";
    g.fillText((rec.note || "").slice(0, 46), x0 + 6, y0 + hh - 22);
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

export function createWorld(canvas, { onHoverFragment, onSelectRecord, lang = "en" } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });

  function makePlanetMaterial({ lineColor = 0x22d3ee, baseOpacity = 0.10, lineOpacity = 0.35 } = {}) {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false, // Option A: always visible landmark
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0.0 },
        uLine: { value: new THREE.Color(lineColor) },
        uBaseOpacity: { value: baseOpacity },
        uLineOpacity: { value: lineOpacity },
      },
      vertexShader: `
        varying vec3 vN;
        varying vec3 vP;
        void main(){
          vN = normalize(normalMatrix * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vP = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uLine;
        uniform float uBaseOpacity;
        uniform float uLineOpacity;
        varying vec3 vN;
        varying vec3 vP;

        // Spherical grid using longitude/latitude bands.
        float gridBands(float v, float freq, float width){
          float x = abs(fract(v * freq) - 0.5);
          return 1.0 - smoothstep(width, width * 1.8, x);
        }

        void main(){
          // map normal to spherical coords
          vec3 n = normalize(vN);
          float lon = atan(n.z, n.x) / 6.2831853 + 0.5;
          float lat = asin(clamp(n.y, -1.0, 1.0)) / 3.1415926 + 0.5;

          // Rotate grid slowly by time (in lon space)
          lon += uTime * 0.006;

          float g1 = gridBands(lon, 24.0, 0.018);
          float g2 = gridBands(lat, 14.0, 0.020);
          float grid = max(g1, g2);

          // subtle purple accents (very low)
          float accent = 0.5 + 0.5 * sin((lon * 8.0 + lat * 6.0) * 6.283 + uTime * 0.25);
          accent = smoothstep(0.92, 0.995, accent) * 0.22;

          // rim fade so it feels like a distant object, not a sticker
          float rim = pow(1.0 - max(0.0, dot(n, vec3(0.0, 0.0, 1.0))), 1.6);
          float a = uBaseOpacity * (0.65 + rim * 0.55) + grid * uLineOpacity + accent * 0.06;

          vec3 col = uLine;
          // slight hue shift with accent (toward purple)
          col = mix(col, vec3(0.43, 0.16, 0.85), accent);

          gl_FragColor = vec4(col, a);
        }
      `,
    });
  }

  function makeHaloMaterial() {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uOpacity: { value: 0.22 },
      },
      vertexShader: `
        varying vec3 vN;
        void main(){
          vN = normalize(normalMatrix * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying vec3 vN;
        void main(){
          float rim = pow(1.0 - abs(vN.z), 2.2);
          gl_FragColor = vec4(0.0, 0.0, 0.0, rim * uOpacity);
        }
      `,
    });
  }

  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

  const scene = new THREE.Scene();
  /* Ghost Cathedral fog: slightly warmer indigo, ~20% brighter; less density so cards
     stay legible deeper down the nave. */
  scene.fog = new THREE.FogExp2(0x0a0d18, 0.0185);

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

  // --- Distant planet landmark (sphere + ring) ---
  // Disabled for now: it reads a bit too "gimmicky" and competes with the UI.
  const ENABLE_PLANET_LANDMARK = false;

  let planetGroup = null;
  let planetMat = null;
  let ringMat = null;

  if (ENABLE_PLANET_LANDMARK) {
    planetGroup = new THREE.Group();
    planetGroup.position.set(0.0, 18.0, -1200.0);
    scene.add(planetGroup);

    const planetR = 240;
    const planetGeo = new THREE.SphereGeometry(planetR, 84, 58);
    planetMat = makePlanetMaterial({ lineColor: 0x22d3ee, baseOpacity: 0.040, lineOpacity: 0.34 });
    const planet = new THREE.Mesh(planetGeo, planetMat);
    planet.renderOrder = -20;
    planetGroup.add(planet);

    // Dark halo to keep it readable against dense lattice
    const haloGeo = new THREE.SphereGeometry(planetR * 1.06, 54, 38);
    const halo = new THREE.Mesh(haloGeo, makeHaloMaterial());
    halo.renderOrder = -21;
    planetGroup.add(halo);

    // Saturn-style data ring
    const ringGeo = new THREE.RingGeometry(planetR * 1.20, planetR * 1.55, 128, 1);
    ringMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0.0 },
        uC1: { value: new THREE.Color(0x22d3ee) },
        uC2: { value: new THREE.Color(0x6d28d9) },
        uOpacity: { value: 0.22 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uC1;
        uniform vec3 uC2;
        uniform float uOpacity;
        varying vec2 vUv;

        void main(){
          // uv.x across ring thickness, uv.y around angle
          float ang = vUv.y * 6.2831853;
          float rad = vUv.x;

          // data dashes
          float dash = fract(ang * 22.0 + uTime * 0.45);
          float gate = smoothstep(0.40, 0.98, sin(ang * 6.0 + uTime * 0.55));
          float on = step(0.62, dash) * gate;

          // radial density falloff (keeps inner ring clean)
          float fall = smoothstep(0.05, 0.32, rad) * (1.0 - smoothstep(0.82, 0.98, rad));

          // subtle radial stripes
          float stripes = 0.5 + 0.5 * sin(rad * 56.0);
          stripes = smoothstep(0.28, 0.86, stripes);

          vec3 col = mix(uC1, uC2, 0.5 + 0.5 * sin(ang * 2.0));
          float a = uOpacity * fall * (0.28 + stripes * 0.72) * (0.30 + on);
          gl_FragColor = vec4(col, a);
        }
      `,
      side: THREE.DoubleSide,
    });

    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI * 0.34;
    ring.rotation.y = Math.PI * 0.12;
    ring.renderOrder = -19;
    planetGroup.add(ring);
  }

  /* --------------------------------------------------------------------
     JarvQuant Universe (replaces Lattice)

     The corridor is now a path through a cyber-universe. Lattice removed;
     instead we scatter a layered starfield and position thematic planets
     along the flight path. Each planet embodies one chapter.
     -------------------------------------------------------------------- */

  // Kept for legacy references (unused after lattice removal; the camera
  // flight path doesn't need a lattice origin anymore).
  const origin = new THREE.Vector3(0.0, 2.2, -72);
  const yaw = 0.0;

  // --- Starfield (3 parallax layers) ---
  const starfields = [];
  function makeStarLayer({ count, spread, depth, size, opacity, color = 0xffffff }) {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = rand(-spread, spread);
      positions[i * 3 + 1] = rand(-spread * 0.55, spread * 0.55);
      positions[i * 3 + 2] = rand(depth[0], depth[1]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const m = new THREE.PointsMaterial({
      color,
      size,
      sizeAttenuation: true,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(g, m);
    scene.add(pts);
    starfields.push({ pts, baseOpacity: opacity });
    return pts;
  }

  // Near layer — small bright stars, slight parallax
  makeStarLayer({ count: 260, spread: 180, depth: [-40, -200], size: 0.14, opacity: 0.85 });
  // Mid layer — main starfield
  makeStarLayer({ count: 520, spread: 360, depth: [-200, -640], size: 0.10, opacity: 0.65 });
  // Far layer — deep dusty haze, subtle cyan tint
  makeStarLayer({ count: 380, spread: 540, depth: [-640, -1100], size: 0.075, opacity: 0.35, color: 0xaad8ee });

  // Coloured stars are now handled by the 2D nebula canvas (always-on, no 3D clipping).

  // --------------------------------------------------------------
  // PLANETS — each chapter has a thematic planet floating off-axis.
  // Prototype (Step 1): Mnemora (Memory). Others cloned in Step 2.
  // --------------------------------------------------------------

  const planets = [];

  // Canvas texture generators per surface theme.
  // All are 2048x1024 (2:1) so spherical UV wraps cleanly.
  function makeMemorySurfaceTexture() {
    const w = 2048, h = 1024;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");

    // Deep indigo base with subtle vertical gradient
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#0a1022");
    grad.addColorStop(0.5, "#0c1832");
    grad.addColorStop(1, "#080e1e");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);

    // Scattered candle streaks (journal fragments of past trades)
    const candles = 320;
    for (let i = 0; i < candles; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const bullish = Math.random() > 0.48;
      const col = bullish ? "rgba(120,238,255,0.92)" : "rgba(170,140,255,0.85)";
      const bodyH = 6 + Math.random() * 38;
      const wickH = bodyH + 8 + Math.random() * 30;
      // wick
      g.strokeStyle = col;
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(x, y - wickH / 2);
      g.lineTo(x, y + wickH / 2);
      g.stroke();
      // body
      g.fillStyle = col;
      g.fillRect(x - 2.0, y - bodyH / 2, 4.0, bodyH);
    }

    // Journal text fragments, mono — denser & a bit brighter
    g.fillStyle = "rgba(200,225,255,0.42)";
    g.font = "600 13px ui-monospace, Menlo, Consolas, monospace";
    const fragments = [
      "T-42d 14:30 NAS100 L", "entry clean", "hesitated",
      "volatility high", "structure intact", "context > outcome",
      "BOS retest", "FVG fill", "EQH swept", "journal #0214",
      "R=1.75", "SL tight", "context noted", "scaled out partial",
      "revisit this one", "pattern recurs", "session AM",
    ];
    for (let i = 0; i < 380; i++) {
      const s = fragments[(Math.random() * fragments.length) | 0];
      g.fillText(s, Math.random() * w, Math.random() * h);
    }

    // A few bright "hot zones" — density clusters like memory peaks
    for (let i = 0; i < 14; i++) {
      const cx = Math.random() * w;
      const cy = Math.random() * h;
      const r = 70 + Math.random() * 180;
      const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, "rgba(79,228,240,0.32)");
      rg.addColorStop(0.6, "rgba(150,120,255,0.10)");
      rg.addColorStop(1, "rgba(79,228,240,0)");
      g.fillStyle = rg;
      g.fillRect(cx - r, cy - r, r * 2, r * 2);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }

  // Composite planet-surface shader: textured base + animated lat/lon grid + rim glow.
  function makePlanetSurfaceMaterial({ texture, accent = 0x4fe4f0, gridOpacity = 0.22 }) {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uMap:         { value: texture },
        uTime:        { value: 0.0 },
        uAccent:      { value: new THREE.Color(accent) },
        uGridOpacity: { value: gridOpacity },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vN;
        void main(){
          vUv = uv;
          vN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform float uTime;
        uniform vec3 uAccent;
        uniform float uGridOpacity;
        varying vec2 vUv;
        varying vec3 vN;

        float gridBands(float v, float freq, float width){
          float x = abs(fract(v * freq) - 0.5);
          return 1.0 - smoothstep(width, width * 1.8, x);
        }

        void main(){
          // Scrolling the texture horizontally gives the planet its rotation look
          vec2 uv = vec2(fract(vUv.x + uTime * 0.008), vUv.y);
          vec4 tex = texture2D(uMap, uv);

          // Lat/lon grid overlay (animated)
          float g1 = gridBands(uv.x + uTime * 0.003, 28.0, 0.014);
          float g2 = gridBands(vUv.y, 16.0, 0.016);
          float grid = max(g1, g2) * uGridOpacity;

          // Rim light — stronger at silhouette, fades facing camera
          float rim = pow(1.0 - max(0.0, dot(normalize(vN), vec3(0.0, 0.0, 1.0))), 1.8);

          // Boost texture contrast so the canvas detail reads through
          vec3 base = tex.rgb * 1.65 + pow(tex.rgb, vec3(0.55)) * 0.18;
          vec3 col = base + uAccent * grid * 0.85 + uAccent * rim * 0.45;
          float a = max(tex.a, grid * 0.5) + rim * 0.18;
          gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
        }
      `,
    });
  }

  // Outer halo sphere — slight cyan/accent rim bloom, draws behind the planet.
  function makePlanetHaloMaterial({ accent = 0x4fe4f0, opacity = 0.35 }) {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      uniforms: {
        uAccent:  { value: new THREE.Color(accent) },
        uOpacity: { value: opacity },
      },
      vertexShader: `
        varying vec3 vN;
        void main(){
          vN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uAccent;
        uniform float uOpacity;
        varying vec3 vN;
        void main(){
          float rim = pow(1.0 - abs(normalize(vN).z), 2.2);
          gl_FragColor = vec4(uAccent, rim * uOpacity);
        }
      `,
    });
  }

  // Saturn-style ring material — animated dash pattern, accent-colored.
  function makePlanetRingMaterial({ accent1 = 0x4fe4f0, accent2 = 0x6d28d9, opacity = 0.55, dashes = 22 }) {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime:    { value: 0.0 },
        uC1:      { value: new THREE.Color(accent1) },
        uC2:      { value: new THREE.Color(accent2) },
        uOpacity: { value: opacity },
        uDashes:  { value: dashes },
      },
      vertexShader: `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uC1;
        uniform vec3 uC2;
        uniform float uOpacity;
        uniform float uDashes;
        varying vec2 vUv;
        void main(){
          float ang = vUv.y * 6.2831853;
          float rad = vUv.x;

          // animated dashes travelling around the ring
          float dash = fract(ang * uDashes + uTime * 0.35);
          float on = smoothstep(0.52, 0.96, dash);

          // radial density — softer at edges, dense in middle
          float fall = smoothstep(0.0, 0.24, rad) * (1.0 - smoothstep(0.78, 1.0, rad));

          // mix colors around the ring
          vec3 col = mix(uC1, uC2, 0.5 + 0.5 * sin(ang * 2.0 + uTime * 0.2));
          float a = uOpacity * fall * (0.25 + on * 0.9);
          gl_FragColor = vec4(col, a);
        }
      `,
    });
  }

  // Reusable planet builder. Returns a {group, ...refs} for animation.
  function makePlanet({
    name,
    position,          // {x,y,z}
    radius = 14,
    surfaceTexture,    // THREE.Texture
    accent = 0x4fe4f0,
    haloAccent = null,
    haloOpacity = 0.38,
    gridOpacity = 0.22,
    rings = [],        // array of {inner, outer, tiltX, tiltY, dashes, accent1, accent2, opacity}
    spin = 0.00045,
    chapterKey = "memory",
  }) {
    const group = new THREE.Group();
    group.position.set(position.x, position.y, position.z);
    scene.add(group);

    // Core surface
    const surfaceMat = makePlanetSurfaceMaterial({ texture: surfaceTexture, accent, gridOpacity });
    const surfaceGeo = new THREE.SphereGeometry(radius, 96, 64);
    const surface = new THREE.Mesh(surfaceGeo, surfaceMat);
    surface.renderOrder = -10;
    group.add(surface);

    // Halo (outer rim glow)
    const haloMat = makePlanetHaloMaterial({ accent: haloAccent ?? accent, opacity: haloOpacity });
    const haloGeo = new THREE.SphereGeometry(radius * 1.18, 64, 44);
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.renderOrder = -11;
    group.add(halo);

    // Rings
    let ringMat = null;
    for (const r of rings) {
      const mat = makePlanetRingMaterial({
        accent1: r.accent1 ?? accent,
        accent2: r.accent2 ?? 0x6d28d9,
        opacity: r.opacity ?? 0.55,
        dashes: r.dashes ?? 22,
      });
      const geo = new THREE.RingGeometry(radius * r.inner, radius * r.outer, 180, 1);
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = r.tiltX ?? Math.PI * 0.32;
      ring.rotation.y = r.tiltY ?? Math.PI * 0.10;
      ring.renderOrder = -9;
      group.add(ring);
      if (!ringMat) ringMat = mat; // keep first for tick animation
    }

    const planetRec = { name, chapterKey, group, surfaceMat, haloMat, ringMat, spin };
    planets.push(planetRec);
    return planetRec;
  }

  // -------- Surface textures for the remaining 4 planets --------

  // Praelum (Threshold) — gateway / portal vibe.
  // Vertical "doorway" bands + glyph rows + a few bright thresholds.
  function makeThresholdSurfaceTexture() {
    const w = 2048, h = 1024;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");

    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#0b0a1e");
    grad.addColorStop(0.5, "#140a2a");
    grad.addColorStop(1, "#080716");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);

    // Vertical doorway columns
    g.strokeStyle = "rgba(150,120,255,0.35)";
    g.lineWidth = 1;
    for (let i = 0; i < 64; i++) {
      const x = (i / 64) * w + (Math.random() * 8 - 4);
      const top = Math.random() * h * 0.3;
      const bot = h - Math.random() * h * 0.3;
      g.globalAlpha = 0.2 + Math.random() * 0.6;
      g.beginPath();
      g.moveTo(x, top);
      g.lineTo(x, bot);
      g.stroke();
    }
    g.globalAlpha = 1;

    // Glyph rows — square ticks
    g.fillStyle = "rgba(120,200,255,0.45)";
    for (let row = 0; row < 14; row++) {
      const y = (row / 14) * h + 28;
      for (let i = 0; i < 240; i++) {
        if (Math.random() < 0.55) continue;
        const x = (i / 240) * w;
        const sz = 1 + Math.random() * 2.4;
        g.fillRect(x, y, sz, sz);
      }
    }

    // Threshold arches — a few bright radial gateways
    for (let i = 0; i < 6; i++) {
      const cx = Math.random() * w;
      const cy = Math.random() * h;
      const r = 90 + Math.random() * 180;
      const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, "rgba(170,140,255,0.30)");
      rg.addColorStop(0.6, "rgba(80,160,240,0.10)");
      rg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = rg;
      g.fillRect(cx - r, cy - r, r * 2, r * 2);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }

  // Revena (Replay) — time / scrubber vibe.
  // Horizontal timelines + scrub markers + waveform pulses.
  function makeReplaySurfaceTexture() {
    const w = 2048, h = 1024;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");

    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#071a22");
    grad.addColorStop(0.5, "#0a2030");
    grad.addColorStop(1, "#06121c");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);

    // Horizontal timeline lanes
    g.strokeStyle = "rgba(120,220,240,0.32)";
    g.lineWidth = 1;
    for (let row = 0; row < 28; row++) {
      const y = (row / 28) * h + 12;
      g.globalAlpha = 0.22 + (row % 4 === 0 ? 0.45 : 0.15);
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    g.globalAlpha = 1;

    // Scrub markers
    g.fillStyle = "rgba(255,180,220,0.55)";
    for (let i = 0; i < 320; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      g.fillRect(x, y - 4, 1.6, 8);
    }

    // Waveform pulses
    g.strokeStyle = "rgba(120,220,240,0.55)";
    g.lineWidth = 1.2;
    for (let row = 0; row < 6; row++) {
      const baseY = (row + 0.5) * (h / 6);
      g.beginPath();
      for (let x = 0; x < w; x += 4) {
        const amp = 18 + Math.sin(x * 0.005 + row) * 14;
        const y = baseY + Math.sin(x * 0.02 + row * 1.7) * amp;
        if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.globalAlpha = 0.18 + Math.random() * 0.25;
      g.stroke();
    }
    g.globalAlpha = 1;

    // A few playback heads — bright vertical bars
    for (let i = 0; i < 4; i++) {
      const x = Math.random() * w;
      const rg = g.createLinearGradient(x - 30, 0, x + 30, 0);
      rg.addColorStop(0, "rgba(255,180,220,0)");
      rg.addColorStop(0.5, "rgba(255,180,220,0.45)");
      rg.addColorStop(1, "rgba(255,180,220,0)");
      g.fillStyle = rg;
      g.fillRect(x - 30, 0, 60, h);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }

  // Structra (Structure) — architectural / blueprint vibe.
  // Orthogonal grid blocks + wiring + module nodes.
  function makeStructureSurfaceTexture() {
    const w = 2048, h = 1024;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");

    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#0a1410");
    grad.addColorStop(0.5, "#101a18");
    grad.addColorStop(1, "#080e0c");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);

    // Blueprint grid
    g.strokeStyle = "rgba(255,200,120,0.18)";
    g.lineWidth = 1;
    const gs = 64;
    for (let x = 0; x <= w; x += gs) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
    }
    for (let y = 0; y <= h; y += gs) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    }

    // Module blocks
    g.strokeStyle = "rgba(255,200,120,0.65)";
    g.lineWidth = 1.4;
    g.fillStyle = "rgba(80,40,20,0.4)";
    for (let i = 0; i < 90; i++) {
      const bw = (1 + Math.floor(Math.random() * 4)) * gs;
      const bh = (1 + Math.floor(Math.random() * 3)) * gs;
      const x = Math.floor(Math.random() * (w - bw) / gs) * gs;
      const y = Math.floor(Math.random() * (h - bh) / gs) * gs;
      g.fillRect(x, y, bw, bh);
      g.strokeRect(x, y, bw, bh);
      // small port node
      g.fillStyle = "rgba(120,255,200,0.85)";
      g.fillRect(x + bw - 6, y + 4, 4, 4);
      g.fillStyle = "rgba(80,40,20,0.4)";
    }

    // Wire traces
    g.strokeStyle = "rgba(120,255,200,0.32)";
    g.lineWidth = 1;
    for (let i = 0; i < 60; i++) {
      const x1 = Math.floor(Math.random() * w / gs) * gs;
      const y1 = Math.floor(Math.random() * h / gs) * gs;
      const x2 = x1 + (Math.random() < 0.5 ? -1 : 1) * gs * (1 + Math.floor(Math.random() * 5));
      const y2 = y1 + (Math.random() < 0.5 ? -1 : 1) * gs * (1 + Math.floor(Math.random() * 4));
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y1);
      g.lineTo(x2, y2);
      g.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }

  // Acumen (Edge) — sharp / solar vibe.
  // Bright core gradients + blade arcs + a small key shape.
  function makeEdgeSurfaceTexture() {
    const w = 2048, h = 1024;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");

    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#1a1208");
    grad.addColorStop(0.5, "#241608");
    grad.addColorStop(1, "#100a04");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);

    // Solar core blooms
    for (let i = 0; i < 18; i++) {
      const cx = Math.random() * w;
      const cy = Math.random() * h;
      const r = 80 + Math.random() * 220;
      const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, "rgba(255,210,120,0.45)");
      rg.addColorStop(0.5, "rgba(255,160,60,0.18)");
      rg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = rg;
      g.fillRect(cx - r, cy - r, r * 2, r * 2);
    }

    // Blade arcs — thin bright curves
    g.strokeStyle = "rgba(255,230,180,0.55)";
    g.lineWidth = 1.2;
    for (let i = 0; i < 70; i++) {
      const cx = Math.random() * w;
      const cy = Math.random() * h;
      const r = 30 + Math.random() * 160;
      const a0 = Math.random() * Math.PI * 2;
      const a1 = a0 + Math.random() * Math.PI * 0.6;
      g.globalAlpha = 0.2 + Math.random() * 0.6;
      g.beginPath();
      g.arc(cx, cy, r, a0, a1);
      g.stroke();
    }
    g.globalAlpha = 1;

    // Key glyphs — small vertical "key teeth"
    g.fillStyle = "rgba(120,220,255,0.55)";
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      g.fillRect(x, y, 2, 8);
      g.fillRect(x - 1, y + 8, 4, 2);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }

  // --- Instantiate the 5 planets along the corridor ---
  // Corridor depth roughly z=0 (near) → z=-1100 (far). Each chapter gets one.
  // Positions alternate sides (-x / +x) so the camera path feels populated.

  // Praelum — Threshold (entry chapter, closest)
  makePlanet({
    name: "Praelum",
    chapterKey: "threshold",
    position: { x: -28, y: 9.5, z: -36 },
    radius: 11,
    surfaceTexture: makeThresholdSurfaceTexture(),
    accent: 0x9c8cff,
    haloAccent: 0x6d28d9,
    haloOpacity: 0.46,
    gridOpacity: 0.22,
    spin: 0.00026,
    rings: [
      { inner: 1.36, outer: 1.62, tiltX: Math.PI * 0.42, tiltY: Math.PI * 0.05,
        dashes: 18, accent1: 0x9c8cff, accent2: 0x4fe4f0, opacity: 0.50 },
    ],
  });

  // Mnemora — Memory (already designed)
  makePlanet({
    name: "Mnemora",
    chapterKey: "memory",
    position: { x: 24, y: -6.0, z: -150 },
    radius: 16,
    surfaceTexture: makeMemorySurfaceTexture(),
    accent: 0x4fe4f0,
    haloAccent: 0x22d3ee,
    haloOpacity: 0.42,
    gridOpacity: 0.28,
    spin: 0.00038,
    rings: [
      { inner: 1.32, outer: 1.58, tiltX: Math.PI * 0.30, tiltY: Math.PI * 0.08,
        dashes: 28, accent1: 0x4fe4f0, accent2: 0x6d28d9, opacity: 0.58 },
      { inner: 1.68, outer: 1.82, tiltX: Math.PI * 0.34, tiltY: Math.PI * 0.14,
        dashes: 42, accent1: 0x6d28d9, accent2: 0x4fe4f0, opacity: 0.38 },
    ],
  });

  // Revena — Replay (mid corridor, opposite side)
  makePlanet({
    name: "Revena",
    chapterKey: "replay",
    position: { x: -34, y: 7.5, z: -260 },
    radius: 14,
    surfaceTexture: makeReplaySurfaceTexture(),
    accent: 0x78dcf0,
    haloAccent: 0xff9ed4,
    haloOpacity: 0.40,
    gridOpacity: 0.20,
    spin: 0.00052,
    rings: [
      { inner: 1.30, outer: 1.50, tiltX: Math.PI * 0.18, tiltY: Math.PI * 0.22,
        dashes: 60, accent1: 0xff9ed4, accent2: 0x78dcf0, opacity: 0.55 },
    ],
  });

  // Structra — Structure (deeper, right side)
  makePlanet({
    name: "Structra",
    chapterKey: "structure",
    position: { x: 20, y: -9.5, z: -360 },
    radius: 13,
    surfaceTexture: makeStructureSurfaceTexture(),
    accent: 0xffc878,
    haloAccent: 0x78ffc8,
    haloOpacity: 0.36,
    gridOpacity: 0.18,
    spin: 0.00022,
    rings: [
      { inner: 1.28, outer: 1.44, tiltX: Math.PI * 0.50, tiltY: Math.PI * 0.02,
        dashes: 14, accent1: 0xffc878, accent2: 0x78ffc8, opacity: 0.52 },
      { inner: 1.52, outer: 1.62, tiltX: Math.PI * 0.50, tiltY: Math.PI * 0.02,
        dashes: 36, accent1: 0x78ffc8, accent2: 0xffc878, opacity: 0.30 },
    ],
  });

  // Acumen — Edge / Access (deepest, off-axis bright sun)
  makePlanet({
    name: "Acumen",
    chapterKey: "edge",
    position: { x: -12, y: 13.0, z: -455 },
    radius: 18,
    surfaceTexture: makeEdgeSurfaceTexture(),
    accent: 0xffd28a,
    haloAccent: 0xffae5a,
    haloOpacity: 0.58,
    gridOpacity: 0.14,
    spin: 0.00018,
    rings: [
      { inner: 1.34, outer: 1.70, tiltX: Math.PI * 0.36, tiltY: Math.PI * 0.18,
        dashes: 22, accent1: 0xffd28a, accent2: 0x4fe4f0, opacity: 0.62 },
    ],
  });

  // --- Data rain (orthogonal "circuit" drops) ---
  // Subtle, not Matrix: thin, right-angled lines with a small node at the bend.
  const rainCount = 350;
  const rain = new Float32Array(rainCount * 6 * 3); // 3 segments -> 6 vertices
  const rainNodes = new Float32Array(rainCount * 3); // one node per drop
  const rainMeta = [];

  function spawnRain(i) {
    // Keep center corridor relatively clean by biasing away from x≈0
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = side * rand(4.2, 14.0);
    const z = rand(-420, 30);
    const y = rand(-2.0, 9.0);

    const vLen = rand(1.2, 5.8);
    const hLen = rand(0.8, 4.6);
    const dir = Math.random() < 0.5 ? -1 : 1;
    const speed = rand(0.35, 1.15) * (Math.random() < 0.22 ? 1.8 : 1.0);

    // Color tint: mix cyan/purple subtly per drop
    const tint = Math.random();
    const color = tint < 0.72 ? 0x22d3ee : 0x6d28d9;

    rainMeta[i] = { x, y, z, vLen, hLen, dir, speed, color };
  }

  for (let i = 0; i < rainCount; i++) spawnRain(i);

  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute("position", new THREE.BufferAttribute(rain, 3));

  const rainMat = new THREE.LineBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.095,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const rainLines = new THREE.LineSegments(rainGeo, rainMat);
  scene.add(rainLines);

  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute("position", new THREE.BufferAttribute(rainNodes, 3));

  const nodeMat = new THREE.PointsMaterial({
    color: 0x6d28d9,
    size: 0.08,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const rainPoints = new THREE.Points(nodeGeo, nodeMat);
  scene.add(rainPoints);

  function rebuildRainGeometry() {
    for (let i = 0; i < rainCount; i++) {
      const m = rainMeta[i];
      const base = i * 18;

      const x0 = m.x;
      const y0 = m.y;
      const z0 = m.z;

      // 3 segments: vertical down, horizontal, vertical down
      const x1 = x0;
      const y1 = y0 - m.vLen;
      const z1 = z0;

      const x2 = x1 + m.dir * m.hLen;
      const y2 = y1;
      const z2 = z1;

      const x3 = x2;
      const y3 = y2 - m.vLen * 0.55;
      const z3 = z2;

      // Segment 1
      rain[base + 0] = x0; rain[base + 1] = y0; rain[base + 2] = z0;
      rain[base + 3] = x1; rain[base + 4] = y1; rain[base + 5] = z1;
      // Segment 2
      rain[base + 6] = x1; rain[base + 7] = y1; rain[base + 8] = z1;
      rain[base + 9] = x2; rain[base +10] = y2; rain[base +11] = z2;
      // Segment 3
      rain[base +12] = x2; rain[base +13] = y2; rain[base +14] = z2;
      rain[base +15] = x3; rain[base +16] = y3; rain[base +17] = z3;

      // Node at the bend
      const nb = i * 3;
      rainNodes[nb + 0] = x1;
      rainNodes[nb + 1] = y1;
      rainNodes[nb + 2] = z1;
    }

    rainGeo.attributes.position.needsUpdate = true;
    nodeGeo.attributes.position.needsUpdate = true;
  }

  rebuildRainGeometry();

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

  let currentLang = (lang === "de" ? "de" : "en");

  function pickLang(obj) {
    if (obj && typeof obj === "object" && ("en" in obj || "de" in obj)) {
      return obj[currentLang] || obj.en || obj.de || "";
    }
    return obj;
  }

  const info = [
    // Threshold / intro (brand)
    // Push the first plate further behind the exhibit wall so it doesn't get occluded by the 6 big exhibit frames.
    {
      id: "IP-0A",
      title: { en: "[JARVQUANT]", de: "[JARVQUANT]" },
      body: {
        en:
          "JarvQuant is a replay-first archive of market memory.\n\n" +
          "It’s built for traders who want evidence — not vibes.\n" +
          "You capture decisions, reconstruct conditions, and turn repetition into structure.\n\n" +
          "The goal is simple: preserve the moment before hindsight, then learn from it on purpose.",
        de:
          "JarvQuant ist ein Replay-first Archiv für Market Memory.\n\n" +
          "Für Trader, die Beweise wollen — nicht Vibes.\n" +
          "Du hältst Entscheidungen fest, rekonstruierst Bedingungen und machst Wiederholung zu Struktur.\n\n" +
          "Das Ziel ist simpel: den Moment vor Hindsight konservieren — und dann bewusst daraus lernen.",
      },
      x: XL,
      y: 1.75,
      z: -44,
      ry: 0.30,
      a: 0.00,
      b: 0.22,
    },
    {
      id: "IP-0B",
      title: { en: "[WHY]", de: "[WARUM]" },
      body: {
        en:
          "Most trading logs store outcomes. JarvQuant stores context.\n\n" +
          "Replay is the core: it lets you revisit price action, spreads, execution assumptions, and your own intent — as if it’s happening again.\n\n" +
          "Over time, the archive becomes your personal dataset of what actually worked for you.",
        de:
          "Die meisten Trading-Logs speichern Outcomes. JarvQuant speichert Kontext.\n\n" +
          "Replay ist der Kern: du siehst Price Action, Spreads, Execution-Annahmen und deine eigene Intention erneut — als würde es wieder passieren.\n\n" +
          "Mit der Zeit wird das Archiv zu deinem persönlichen Dataset dessen, was für dich wirklich funktioniert hat.",
      },
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
      title: { en: "[MEMORY]", de: "[MEMORY]" },
      body: {
        en:
          "Memory is not a folder — it’s a system.\n\n" +
          "JarvQuant captures fragments: trades, screenshots, notes, and the subtle signals you noticed (or missed).\n" +
          "Then it makes them searchable, revisit-able, and exportable — so learning compounds.",
        de:
          "Memory ist kein Ordner — es ist ein System.\n\n" +
          "JarvQuant hält Fragmente fest: Trades, Screenshots, Notizen und die subtilen Signale, die du gesehen (oder übersehen) hast.\n" +
          "Dann macht es alles durchsuchbar, wiedererlebbar und exportierbar — damit Lernen sich aufschichtet.",
      },
      x: XR,
      y: 1.65,
      z: -72,
      ry: -0.26,
      a: 0.10,
      b: 0.44,
    },
    {
      id: "IP-1B",
      title: { en: "[JOURNAL]", de: "[JOURNAL]" },
      body: {
        en:
          "Write the why — not just the what.\n\n" +
          "A journal entry links your idea to evidence: context, execution, and post-trade reflection.\n" +
          "Export turns memory into something you can share, review, and improve.",
        de:
          "Schreib das Warum — nicht nur das Was.\n\n" +
          "Ein Journal-Eintrag verbindet deine Idee mit Evidence: Kontext, Execution und Post-Trade-Reflexion.\n" +
          "Export macht Memory zu etwas, das du teilen, reviewen und verbessern kannst.",
      },
      x: XL,
      y: 1.35,
      z: -92,
      ry: 0.26,
      a: 0.10,
      b: 0.44,
    },

    // POSITIONING (in-corridor, split into 3 plates)
    // Space them out to avoid visual clustering.
    {
      id: "IP-1C",
      title: { en: "[MODEL]", de: "[MODELL]" },
      body: {
        en:
          "No VC dependency. No external pricing pressure.\n\n" +
          "No 'we monetize your data' — structurally impossible by design.",
        de:
          "Keine VC-Abhängigkeit. Kein Preisdruck von außen.\n\n" +
          "Kein ‚wir monetarisieren eure Daten‘ — strukturell unmöglich by design.",
      },
      x: XR,
      y: 1.65,
      z: -112,
      ry: -0.26,
      a: 0.18,
      b: 0.52,
    },
    {
      id: "IP-1D",
      title: { en: "[APPROACH]", de: "[ANSATZ]" },
      body: {
        en:
          "Built by a solo developer + an AI agent — no bloated team, no overhead.\n\n" +
          "Community-first beta: real feedback before public launch.\n\n" +
          "Course-sellers need you to sell. You're building what they can’t deliver.",
        de:
          "Gebaut von einem Entwickler + AI Agent — kein aufgeblasenes Team, kein Overhead.\n\n" +
          "Community-first Beta: echtes Feedback vor Public Launch.\n\n" +
          "Kurs-Verkäufer brauchen dich, um zu verkaufen. Du baust, was sie nie liefern können.",
      },
      x: XL,
      y: 1.45,
      z: -150,
      ry: 0.26,
      a: 0.18,
      b: 0.52,
    },
    {
      id: "IP-1E",
      title: { en: "[ANGLE]", de: "[ANGLE]" },
      body: {
        en:
          "Trading education is broken: courses, Discords, lifestyle content.\n\n" +
          "JarvQuant gives traders what institutions have had for years.\n\n" +
          "Faster. Leaner. More honest than what exists right now.",
        de:
          "Trading Education ist kaputt: Kurse, Discords, Lifestyle-Content.\n\n" +
          "JarvQuant gibt Tradern, was Institutionen seit Jahren haben.\n\n" +
          "Schneller. Schlanker. Ehrlicher als alles, was gerade existiert.",
      },
      x: XR,
      y: 1.55,
      z: -188,
      ry: -0.26,
      a: 0.18,
      b: 0.52,
    },

    // REPLAY
    {
      id: "IP-2A",
      title: { en: "[REPLAY]", de: "[REPLAY]" },
      body: {
        en:
          "Replay is a controlled return to the past.\n\n" +
          "You can step, scrub, and re-run the same scenario — while accounting for spread, slippage, and fees.\n" +
          "The point is not entertainment. It’s to train decision-making under real constraints.",
        de:
          "Replay ist eine kontrollierte Rückkehr in die Vergangenheit.\n\n" +
          "Du kannst step-by-step, scrubben und das gleiche Szenario erneut laufen lassen — inklusive Spread, Slippage und Fees.\n" +
          "Der Punkt ist nicht Entertainment, sondern Entscheidungsfindung unter echten Constraints zu trainieren.",
      },
      x: XL,
      y: 1.55,
      z: -124,
      ry: 0.28,
      a: 0.36,
      b: 0.68,
    },
    {
      id: "IP-2B",
      title: { en: "[TESTS]", de: "[TESTS]" },
      body: {
        en:
          "Small tests beat big opinions.\n\n" +
          "Try micro-variations: different entries, invalidations, risk models.\n" +
          "Compare outcomes in the same market slice — then keep what survives costs.",
        de:
          "Kleine Tests schlagen große Meinungen.\n\n" +
          "Probier Micro-Variationen: andere Entries, Invalidations, Risk-Modelle.\n" +
          "Vergleiche Outcomes im gleichen Market Slice — und behalte, was Kosten überlebt.",
      },
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
      title: { en: "[STRUCTURE]", de: "[STRUKTUR]" },
      body: {
        en:
          "Structure is what remains when motivation fades.\n\n" +
          "JarvQuant helps you turn patterns into rules: entries, exits, filters, and constraints.\n" +
          "Validation blocks bad runs early — so you iterate with clarity, not hope.",
        de:
          "Struktur ist das, was bleibt, wenn Motivation weg ist.\n\n" +
          "JarvQuant hilft dir, Patterns in Regeln zu verwandeln: Entries, Exits, Filter und Constraints.\n" +
          "Validation stoppt schlechte Runs früh — damit du mit Klarheit iterierst, nicht mit Hoffnung.",
      },
      x: XR,
      y: 1.75,
      z: -198,
      ry: -0.28,
      a: 0.62,
      b: 0.90,
    },
    {
      id: "IP-3B",
      title: { en: "[PRESETS]", de: "[PRESETS]" },
      body: {
        en:
          "Presets are experiments you can repeat.\n\n" +
          "Save assumptions, execution settings, and constraints — then re-run safely.\n" +
          "The archive keeps comparisons clean: same inputs, clear deltas.",
        de:
          "Presets sind Experimente, die du wiederholen kannst.\n\n" +
          "Speichere Annahmen, Execution-Settings und Constraints — und rerun sicher.\n" +
          "Das Archiv hält Vergleiche sauber: gleiche Inputs, klare Deltas.",
      },
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
      title: { en: "[EDGE]", de: "[EDGE]" },
      body: {
        en:
          "Edge is not a secret indicator.\n\n" +
          "It’s a disciplined loop: capture → replay → test → structure.\n" +
          "When you can prove your process, confidence stops being a mood.",
        de:
          "Edge ist kein geheimer Indikator.\n\n" +
          "Es ist ein disziplinierter Loop: capture → replay → test → structure.\n" +
          "Wenn du deinen Prozess beweisen kannst, ist Confidence kein Mood mehr.",
      },
      x: XL,
      y: 1.65,
      z: -276,
      ry: 0.28,
      a: 0.84,
      b: 1.00,
    },
    {
      id: "IP-4B",
      title: { en: "[ACCESS]", de: "[ZUGANG]" },
      body: {
        en:
          "JarvQuant is currently internal.\n\n" +
          "Public beta is planned at v0.5.0 (limited invites).\n" +
          "Discord is the primary path to invites and drops.",
        de:
          "JarvQuant ist aktuell intern.\n\n" +
          "Public Beta ist ab v0.5.0 geplant (limitierte Invites).\n" +
          "Discord ist der primäre Weg zu Invites und Drops.",
      },
      x: XR,
      y: 1.45,
      z: -296,
      ry: -0.28,
      a: 0.84,
      b: 1.00,
    },
  ];

  // Curate the corridor: keep only one "field caption" per chapter (4 total).
  // Each plate is now a single sculpted line — sculpture label, not paragraph.
  const KEEP_INFO_IDS = new Set(["IP-1A", "IP-2A", "IP-3A", "IP-4A"]);
  const captionRewrite = {
    "IP-1A": {
      title: { en: "MNEMORA", de: "MNEMORA" },
      body:  { en: "Captured. Searchable. Yours.",
               de: "Festgehalten. Durchsuchbar. Deins." },
    },
    "IP-2A": {
      title: { en: "REVENA", de: "REVENA" },
      body:  { en: "Time as a surface — not a chart.",
               de: "Zeit als Fläche — kein Chart." },
    },
    "IP-3A": {
      title: { en: "STRUCTRA", de: "STRUCTRA" },
      body:  { en: "Patterns become rules.",
               de: "Aus Mustern werden Regeln." },
    },
    "IP-4A": {
      title: { en: "ACUMEN", de: "ACUMEN" },
      body:  { en: "Process, proven.",
               de: "Prozess, bewiesen." },
    },
  };
  const _infoFiltered = info.filter((it) => KEEP_INFO_IDS.has(it.id));
  info.length = 0;
  for (const it of _infoFiltered) {
    const r = captionRewrite[it.id];
    if (r) { it.title = r.title; it.body = r.body; }
    info.push(it);
  }

  // Re-anchor remaining plates next to their planet (opposite side, slight offset)
  // so they read like a side-caption rather than blocking the path.
  const anchorPos = {
    "IP-1A": { x: -22, y: 6.5,  z: -126, ry:  0.32 }, // Memory  (Mnemora at +24,-6,-150)
    "IP-2A": { x:  26, y: -3.5, z: -236, ry: -0.32 }, // Replay  (Revena  at -34,7.5,-260)
    "IP-3A": { x: -24, y: 6.0,  z: -332, ry:  0.32 }, // Structure (Structra at +20,-9.5,-360)
    "IP-4A": { x:  22, y: -2.5, z: -432, ry: -0.32 }, // Edge    (Acumen  at -12,13,-455)
  };
  for (const it of info) {
    const a = anchorPos[it.id];
    if (a) { it.x = a.x; it.y = a.y; it.z = a.z; it.ry = a.ry; }
  }

  function applyInfoLang(it, border, inner) {
    const t = pickLang(it.title);
    const b = pickLang(it.body);
    const tex = makeTextTexture({ title: t, body: b });
    inner.material.map = tex;
    inner.material.needsUpdate = true;

    // Keep record text in sync (used by hover/panel)
    if (border?.userData?.rec) {
      border.userData.rec.setup = t;
      border.userData.rec.note = b;
    }
  }

  for (const it of info) {
    const tex = makeTextTexture({ title: pickLang(it.title), body: pickLang(it.body) });
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
      setup: pickLang(it.title),
      r: "—",
      note: pickLang(it.body),
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

    // keep defs for live language switching
    border.userData.infoDef = it;
    border.userData.infoInner = inner;

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

  const smallCount = 80;
  for (let i = 0; i < smallCount; i++) {
    const tag = chooseChapterTag();
    const rec = makeRecord(i);
    applyChapterFlavor(rec, tag, i);

    /* Curated scatter: fewer, larger cards so the texture reads at distance. */
    const w = rand(1.15, 1.65);
    const h = w * rand(0.62, 0.74);

    const border = new THREE.Mesh(makeFrameGeometry(w, h), baseBorder.clone());
    border.userData.rec = rec;

    const plate = new THREE.Mesh(makeFrameGeometry(w * 0.985, h * 0.985), plateMat.clone());
    plate.position.z = -0.001;
    border.add(plate);

    // Always show inner texture now — fewer cards means each must carry weight.
    const tex = makeMiniRecordTexture(rec);
    const inner = new THREE.Mesh(
      makeFrameGeometry(w * 0.95, h * 0.95),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.96, depthWrite: false })
    );
    inner.position.z = 0.001;
    border.add(inner);

    let x, y, z;
    for (let tries = 0; tries < 60; tries++) {
      x = rand(-12.5, 12.5);
      y = rand(-2.4, 5.6);
      z = sampleZ(tag);
      if (!inGalleryClearZone(x, y, z) && !inDeepClearZone(x, y, z) && !inReservedZone(x, y, z)) break;
    }

    border.position.set(x, y, z);
    /* Ghost Cathedral: smaller yaw range (±0.22 ≈ ±13°) — subtle irregularity, not chaos. */
    border.rotation.y = rand(-0.22, 0.22);

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
  function setChapter(name) {
    state.chapter = name;
    // Planet emphasis: active chapter's planet → full halo + grid; others dimmed.
    for (const p of planets) {
      const isActive = p.chapterKey === name;
      // Cache base values once
      if (p._baseHalo == null && p.haloMat?.uniforms?.uOpacity) {
        p._baseHalo = p.haloMat.uniforms.uOpacity.value;
      }
      if (p._baseGrid == null && p.surfaceMat?.uniforms?.uGridOpacity) {
        p._baseGrid = p.surfaceMat.uniforms.uGridOpacity.value;
      }
      if (p.haloMat?.uniforms?.uOpacity && p._baseHalo != null) {
        p.haloMat.uniforms.uOpacity.value = isActive ? p._baseHalo * 1.55 : p._baseHalo * 0.42;
      }
      if (p.surfaceMat?.uniforms?.uGridOpacity && p._baseGrid != null) {
        p.surfaceMat.uniforms.uGridOpacity.value = isActive ? p._baseGrid * 1.35 : p._baseGrid * 0.55;
      }
      // Mark active for tick() pulse animation
      p._active = isActive;
    }
  }
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
        if (hovered && hovered !== selected) {
          hovered.material = hovered.userData._matBase || hovered.material;
          hovered.scale.set(1, 1, 1);
        }
        hovered = obj;

        if (!obj.userData._matBase) obj.userData._matBase = obj.material;
        if (obj !== selected) obj.material = hoverBorder.clone();
        // Visual affordance: gentle scale-up tells the eye "this is interactive"
        obj.scale.set(1.08, 1.08, 1.08);
        canvas.style.cursor = "pointer";

        if (onHoverFragment) {
          if (rec.id.startsWith("EX-")) onHoverFragment({ title: `${rec.id} · EXHIBIT`, sub: `${rec.setup}\nClick to open.` });
          // MF-* manifest plates removed
          else if (rec.id.startsWith("IP-")) onHoverFragment({ title: `${rec.id} · SYSTEM`, sub: `${rec.setup}\nClick to read.` });
          else onHoverFragment({ title: `${rec.id} · ${rec.setup}`, sub: `${rec.ts} · ${rec.instrument} · ${rec.r}\n${rec.note}` });
        }
      }
    } else {
      if (hovered && hovered !== selected) {
        hovered.material = hovered.userData._matBase || hovered.material;
        hovered.scale.set(1, 1, 1);
      }
      hovered = null;
      canvas.style.cursor = "";
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
    const t = now * 0.00055;

    // Starfield twinkle — very subtle pulse so layers don't feel dead.
    for (let i = 0; i < starfields.length; i++) {
      const s = starfields[i];
      const phase = 0.5 + 0.5 * Math.sin(t * (0.6 + i * 0.25) + i * 1.3);
      s.pts.material.opacity = s.baseOpacity * (0.82 + phase * 0.20);
    }

    // Planet rotations + shader time uniforms + active-pulse on halo
    for (const p of planets) {
      if (!p.group) continue;
      p.group.rotation.y += p.spin;
      if (p.surfaceMat?.uniforms?.uTime) p.surfaceMat.uniforms.uTime.value = now * 0.001;
      if (p.ringMat?.uniforms?.uTime) p.ringMat.uniforms.uTime.value = now * 0.001;

      // Active planet: gentle breath on halo so the eye knows where to land.
      if (p._active && p._baseHalo != null && p.haloMat?.uniforms?.uOpacity) {
        const breath = 1.55 + Math.sin(now * 0.0014) * 0.18;
        p.haloMat.uniforms.uOpacity.value = p._baseHalo * breath;
      }
    }

    // Planet landmark animation (optional)
    if (planetGroup && ringMat && planetMat) {
      planetGroup.rotation.y += 0.00035;
      ringMat.uniforms.uTime.value = now * 0.001;
      planetMat.uniforms.uTime.value = now * 0.001;
    }

    // Animate data rain
    // Use time-based step (stable across frame rates)
    const dt = 1 / 60;
    for (let i = 0; i < rainMeta.length; i++) {
      const m = rainMeta[i];
      m.y -= m.speed * dt;

      // Respawn once it drops past the floor band
      if (m.y < -5.2) {
        spawnRain(i);
      }
    }

    rebuildRainGeometry();

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

  function setLang(next) {
    const nl = next === "de" ? "de" : "en";
    if (nl === currentLang) return;
    currentLang = nl;

    // Rebuild textures + record copy for all info plates
    for (const p of infoPlates) {
      const def = p?.userData?.infoDef;
      const inner = p?.userData?.infoInner;
      if (!def || !inner) continue;
      applyInfoLang(def, p, inner);
    }

    // If a plate is selected, refresh the record panel text instantly
    if (selected?.userData?.rec && onSelectRecord) {
      const rec = selected.userData.rec;
      onSelectRecord({
        title: `${rec.id} · ${rec.instrument} · ${rec.setup}`,
        body: `${rec.ts} · ${rec.r}\n\n${rec.note}`,
      });
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
    setLang,
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
