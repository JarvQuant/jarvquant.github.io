import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function makeCapsuleRecord(i) {
  const setups = ["Breakout Retest", "Liquidity Sweep", "Trend Continuation", "Range Fade", "Impulse Pullback", "Compression Release"];
  const emotions = ["calm", "rushed", "hesitant", "certain", "numb", "sharp"];
  const mistakes = ["late entry", "no plan", "risk drift", "confirmation bias", "moved stop", "overtraded"];
  const insights = [
    "Volatility was the signal — not the candle.",
    "My entry was emotion disguised as logic.",
    "The market repeated a pattern I refused to name.",
    "Edge appeared only after I stopped forcing it.",
    "Structure held. Discipline didn’t.",
    "The setup worked. Timing didn’t."
  ];

  const daysAgo = Math.floor(rand(4, 280));
  const hh = String(Math.floor(rand(6, 22))).padStart(2, "0");
  const mm = String(Math.floor(rand(0, 59))).padStart(2, "0");

  const record = {
    id: `JQ-${String(i + 1).padStart(4, "0")}`,
    title: pick(["Decision Capsule", "Journal Imprint", "Replay Fragment", "Setup Echo"]),
    ts: `T-${daysAgo}d · ${hh}:${mm}Z`,
    tags: [pick(["ES", "NQ", "DAX", "BTC", "EURUSD"]), pick(setups)],
    note: pick(insights),
    meta: `state: ${pick(emotions)} · risk: ${pick(["0.5R", "1R", "1.5R", "2R"])} · error: ${pick(mistakes)}`
  };

  return record;
}

/**
 * createWorld(canvas, { onHoverFragment })
 */
export function createWorld(canvas, { onHoverFragment } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05060a, 0.035);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 260);
  camera.position.set(0, 1.35, 9.2);

  // Lights: keep minimal, but enough for readability
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));

  const dir = new THREE.DirectionalLight(0x88ddff, 0.35);
  dir.position.set(6, 8, 5);
  scene.add(dir);

  const rim = new THREE.PointLight(0x22D3EE, 0.55, 28);
  rim.position.set(-6, 3, 6);
  scene.add(rim);

  // --- BASE GRID PLANES ---
  const grid1 = new THREE.GridHelper(260, 260, 0x22D3EE, 0x22D3EE);
  grid1.material.opacity = 0.085;
  grid1.material.transparent = true;
  grid1.position.y = -1.25;
  scene.add(grid1);

  const grid2 = new THREE.GridHelper(260, 52, 0x6D28D9, 0x6D28D9);
  grid2.material.opacity = 0.032;
  grid2.material.transparent = true;
  grid2.position.y = -1.22;
  scene.add(grid2);

  // Primary axis lines (helps orientation)
  const axisMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.10 });
  const axisGeomX = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-140, -1.18, 0), new THREE.Vector3(140, -1.18, 0)]);
  const axisGeomZ = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1.18, -140), new THREE.Vector3(0, -1.18, 140)]);
  scene.add(new THREE.Line(axisGeomX, axisMat));
  scene.add(new THREE.Line(axisGeomZ, axisMat));

  // --- MATRIX WALL (vertical lattice) ---
  // Very thin lines + fog => "archive cathedral" feel without particles.
  const wall = new THREE.Group();
  scene.add(wall);

  const wallMat = new THREE.LineBasicMaterial({ color: 0x22D3EE, transparent: true, opacity: 0.055 });
  const span = 120;
  const step = 6;

  for (let x = -span; x <= span; x += step) {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, -1.25, -span),
      new THREE.Vector3(x, 12.0, -span),
    ]);
    const ln = new THREE.Line(g, wallMat);
    ln.position.z = 0;
    wall.add(ln);
  }

  const wallMat2 = new THREE.LineBasicMaterial({ color: 0x6D28D9, transparent: true, opacity: 0.030 });
  for (let z = -span; z <= span; z += step) {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-span, -1.25, z),
      new THREE.Vector3(-span, 12.0, z),
    ]);
    const ln = new THREE.Line(g, wallMat2);
    ln.position.x = 0;
    wall.add(ln);
  }

  // --- DISTANT NODES (points) ---
  const N = 900; // bigger “archive dust” but still light
  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);

  const c1 = new THREE.Color(0x6D28D9);
  const c2 = new THREE.Color(0x22D3EE);
  for (let i = 0; i < N; i++) {
    const x = rand(-90, 90);
    const y = rand(-1.0, 10.0);
    const z = rand(-110, 70);
    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const mix = Math.random();
    const col = c1.clone().lerp(c2, mix);
    colors[i * 3 + 0] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }

  const pGeom = new THREE.BufferGeometry();
  pGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pGeom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const pMat = new THREE.PointsMaterial({
    size: 0.045,
    vertexColors: true,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(pGeom, pMat);
  scene.add(points);

  // --- CAPSULES (meaningful objects) ---
  const capsuleGroup = new THREE.Group();
  scene.add(capsuleGroup);

  // Fresnel-like rim shader (simple, fast)
  const fresnelMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(0x22D3EE) },
      uPower: { value: 2.2 },
      uAlpha: { value: 0.18 },
    },
    vertexShader: `
      varying vec3 vN;
      varying vec3 vV;
      void main(){
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uPower;
      uniform float uAlpha;
      varying vec3 vN;
      varying vec3 vV;
      void main(){
        float f = pow(1.0 - max(dot(vN, vV), 0.0), uPower);
        gl_FragColor = vec4(uColor, f * uAlpha);
      }
    `
  });

  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x0b1120,
    metalness: 0.22,
    roughness: 0.26,
    transparent: true,
    opacity: 0.72,
    emissive: new THREE.Color(0x05070f),
    emissiveIntensity: 0.4,
  });

  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x07101a,
    metalness: 0.0,
    roughness: 0.65,
    transparent: true,
    opacity: 0.12,
    emissive: new THREE.Color(0x22D3EE),
    emissiveIntensity: 0.28,
  });

  const capsuleData = [];
  const capsuleCount = 96; // “real archive” feeling
  for (let i = 0; i < capsuleCount; i++) {
    const rec = makeCapsuleRecord(i);

    // size variety
    const w = rand(0.28, 0.65);
    const h = rand(0.14, 0.30);
    const d = rand(0.18, 0.42);
    const geo = new THREE.BoxGeometry(w, h, d);

    const glow = new THREE.Mesh(geo, glowMat.clone());
    const core = new THREE.Mesh(geo, coreMat.clone());
    const rimShell = new THREE.Mesh(geo, fresnelMat.clone());

    // distribute in a “field”: forward and wide, with depth
    const x = rand(-8.5, 8.5);
    const y = rand(-0.2, 2.8);
    const z = rand(-28, -4.5);

    core.position.set(x, y, z);
    glow.position.copy(core.position);
    rimShell.position.copy(core.position);

    const rx = rand(-0.22, 0.22);
    const ry = rand(-0.65, 0.65);
    core.rotation.set(rx, ry, 0);
    glow.rotation.copy(core.rotation);
    rimShell.rotation.copy(core.rotation);

    capsuleGroup.add(glow);
    capsuleGroup.add(core);
    capsuleGroup.add(rimShell);

    capsuleData.push({
      core,
      glow,
      rim: rimShell,
      rec
    });
  }

  // Interaction
  const raycaster = new THREE.Raycaster();
  raycaster.params.Points.threshold = 0.12;
  const pointer = new THREE.Vector2(0, 0);
  let hoveredKey = null;

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
    camZ: camera.position.z
  };

  function setChapter(name) {
    state.targetChapter = name;
  }
  function setEntered(v) {
    state.entered = !!v;
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
      if (hoveredKey !== null) hoveredKey = null;
      if (onHoverFragment) onHoverFragment(null);
      return;
    }

    raycaster.setFromCamera(pointer, camera);
    const hitsCaps = raycaster.intersectObjects(capsuleData.map(x => x.core), false);

    if (hitsCaps.length) {
      const obj = hitsCaps[0].object;
      const item = capsuleData.find(x => x.core === obj);
      if (item) {
        const key = item.rec.id;
        if (hoveredKey !== key) {
          hoveredKey = key;
          if (onHoverFragment) {
            onHoverFragment({
              title: `${item.rec.id} · ${item.rec.title}`,
              sub: `${item.rec.ts} · ${item.rec.tags.join(" · ")}\n${item.rec.note}\n${item.rec.meta}`
            });
          }
        }
        return;
      }
    }

    // If nothing: clear
    if (hoveredKey !== null) {
      hoveredKey = null;
      if (onHoverFragment) onHoverFragment(null);
    }
  }

  // animation loop
  let t0 = performance.now();
  function tick(now) {
    const dt = (now - t0) / 1000;
    t0 = now;
    const time = now * 0.00018;

    // subtle drift for the whole “cathedral”
    grid1.position.x = Math.sin(time) * 0.55;
    grid1.position.z = Math.cos(time) * 0.55;
    grid2.position.x = Math.cos(time * 0.75) * 0.22;
    grid2.position.z = Math.sin(time * 0.75) * 0.22;

    wall.rotation.y = Math.sin(time * 0.35) * 0.02;

    // parallax camera (restrained)
    const px = clamp(state.mouseX, -1, 1);
    const py = clamp(state.mouseY, -1, 1);

    const targetX = px * 0.65;
    const targetY = 1.35 + py * 0.26;

    camera.position.x = lerp(camera.position.x, targetX, 0.055);
    camera.position.y = lerp(camera.position.y, targetY, 0.055);

    // chapter camera depth
    const zTargets = {
      threshold: 9.2,
      memory: 7.6,
      replay: 8.2,
      structure: 8.0,
      edge: 8.8,
    };
    const zt = zTargets[state.targetChapter] ?? 9.2;
    camera.position.z = lerp(camera.position.z, zt, 0.04);

    // slow capsule drift + hover accent
    capsuleGroup.rotation.y += dt * 0.03;

    for (const c of capsuleData) {
      const isOn = hoveredKey === c.rec.id;

      const tGlow = isOn ? 0.24 : 0.11;
      const tCore = isOn ? 0.92 : 0.72;
      const tRimA = isOn ? 0.42 : 0.18;

      c.glow.material.opacity = lerp(c.glow.material.opacity, tGlow, 0.08);
      c.core.material.opacity = lerp(c.core.material.opacity, tCore, 0.08);
      c.rim.material.uniforms.uAlpha.value = lerp(c.rim.material.uniforms.uAlpha.value, tRimA, 0.08);

      // micro hover lift
      c.core.position.y += (isOn ? 0.0009 : -0.0004);
      c.glow.position.y = c.core.position.y;
      c.rim.position.y = c.core.position.y;
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
