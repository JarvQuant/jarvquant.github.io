export function createAmbientEngine({
  src = "assets/audio.mp3",
  baseGain = 0.18,
  fadeSeconds = 0.65,
} = {}) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();

  const master = ctx.createGain();
  master.gain.value = 0.0; // start muted
  master.connect(ctx.destination);

  // Use <audio> element for robust mp3 decode + streaming
  const el = new Audio();
  el.src = src;
  el.loop = true;          // will loop, but gapless depends on encoding
  el.preload = "auto";
  el.crossOrigin = "anonymous";

  const node = ctx.createMediaElementSource(el);
  node.connect(master);

  let isMuted = true;
  let started = false;

  async function ensureRunning() {
    if (ctx.state !== "running") {
      await ctx.resume();
    }
  }

  async function startIfNeeded() {
    if (started) return;
    started = true;

    // Try to start playback (must be after user gesture)
    try {
      el.currentTime = 0;
      await el.play();
    } catch (e) {
      // If autoplay is blocked, user needs to click again (Enter/mute toggle)
      started = false;
      throw e;
    }
  }

  function fadeTo(target) {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(target, now + fadeSeconds);
  }

  async function setMuted(muted) {
    isMuted = !!muted;
    await ensureRunning();

    if (!isMuted) {
      await startIfNeeded();
      fadeTo(baseGain);
    } else {
      fadeTo(0.0);
      // keep the element playing silently (more seamless than pausing)
    }
  }

  async function toggleMute() {
    await setMuted(!isMuted);
    return isMuted;
  }

  function getMuted() {
    return isMuted;
  }

  function shutdown() {
    try { el.pause(); } catch {}
    try { ctx.close(); } catch {}
  }

  // Optional: expose element for debugging
  return { ctx, el, ensureRunning, setMuted, toggleMute, getMuted, shutdown };
}
