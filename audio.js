export function createAmbientEngine() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain();
  master.gain.value = 0.0; // start muted; we'll fade in on unmute
  master.connect(ctx.destination);

  // A soft low pad using 2 detuned oscillators + filter
  const oscA = ctx.createOscillator();
  const oscB = ctx.createOscillator();
  oscA.type = "sine";
  oscB.type = "sine";
  oscA.frequency.value = 55;    // A1
  oscB.frequency.value = 55.7;  // slight detune

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 420;
  filter.Q.value = 0.7;

  const padGain = ctx.createGain();
  padGain.gain.value = 0.22;

  // Subtle "memory shimmer" with noise-like breath (using a filtered random buffer)
  const noise = ctx.createBufferSource();
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.25;
  noise.buffer = buffer;
  noise.loop = true;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 180;
  noiseFilter.Q.value = 0.9;

  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.06;

  // Slow LFO to animate filter + gains
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.035;

  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 110;

  // Patch
  oscA.connect(filter);
  oscB.connect(filter);
  filter.connect(padGain);
  padGain.connect(master);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(master);

  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  oscA.start();
  oscB.start();
  noise.start();
  lfo.start();

  let isMuted = true;

  async function ensureRunning() {
    if (ctx.state !== "running") {
      await ctx.resume();
    }
  }

  function setMuted(muted) {
    isMuted = !!muted;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);

    // very gentle fade
    const target = isMuted ? 0.0 : 0.16; // keep it restrained
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(target, now + 0.65);
  }

  function toggleMute() {
    setMuted(!isMuted);
    return isMuted;
  }

  function getMuted() {
    return isMuted;
  }

  function shutdown() {
    try { ctx.close(); } catch {}
  }

  return { ctx, ensureRunning, setMuted, toggleMute, getMuted, shutdown };
}
