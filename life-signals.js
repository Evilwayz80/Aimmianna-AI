// A little fictional radio, synthesized on-device. No audio capture or network.
export function makeSignalRadio(initialVolume) {
  const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Audio) throw new Error("Web Audio unavailable");
  const ctx = new Audio();
  let stopped = false, nextReplay = 0, peakHeld = false, nextPeak = 0;
  let muted = initialVolume <= 0, peakTone = null;
  const clueTones = new Set();
  const master = ctx.createGain();
  const gainFor = (v) => Math.min(100, Math.max(0, v)) / 100 * 0.60;
  master.gain.value = gainFor(initialVolume);
  master.connect(ctx.destination);

  const noise = ctx.createBuffer(2, ctx.sampleRate * 5, ctx.sampleRate);
  for (let c = 0; c < noise.numberOfChannels; c++) {
    const samples = noise.getChannelData(c);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = noise;
  source.loop = true;

  function layer(kind, hz, level, output) {
    const filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    filter.type = kind;
    filter.frequency.value = hz;
    filter.Q.value = 0.65;
    gain.gain.value = level;
    source.connect(filter).connect(gain).connect(output);
    return { filter, gain };
  }
  const panner = typeof ctx.createStereoPanner === "function" ? ctx.createStereoPanner() : null;
  const motionGain = ctx.createGain();
  motionGain.connect(panner || master);
  panner?.connect(master);
  layer("lowpass", 1750, 0.34, master);
  const staticLayer = layer("bandpass", 950, 0.09, motionGain);
  source.start();

  function quietPeak() {
    if (!peakTone) return;
    const { tone, envelope } = peakTone;
    peakTone = null;
    envelope.disconnect();
    try { tone.stop(); } catch { /* already ended */ }
  }
  function playPeak(now) {
    if (muted || ctx.state !== "running" || now < nextPeak || clueTones.size) return;
    nextPeak = now + 2.4;
    const tone = ctx.createOscillator(), envelope = ctx.createGain();
    tone.type = "sine";
    tone.frequency.value = 660;
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(0.055, now + 0.045);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
    tone.connect(envelope).connect(master);
    const entry = { tone, envelope };
    peakTone = entry;
    tone.onended = () => {
      if (peakTone === entry) peakTone = null;
      tone.disconnect(); envelope.disconnect();
    };
    tone.start(now); tone.stop(now + 0.31);
  }

  function playClue() {
    const now = ctx.currentTime;
    if (stopped || ctx.state !== "running" || now < nextReplay) return;
    quietPeak();
    nextReplay = now + 1.35;
    for (const [i, delay] of [0.20, 0.51, 0.91].entries()) {
      const t = now + delay, tone = ctx.createOscillator(), envelope = ctx.createGain();
      tone.type = "triangle";
      tone.frequency.setValueAtTime(224 - i * 12, t);
      tone.frequency.exponentialRampToValueAtTime(103 - i * 4, t + 0.11);
      envelope.gain.setValueAtTime(0, t);
      envelope.gain.linearRampToValueAtTime(0.22, t + 0.025);
      envelope.gain.exponentialRampToValueAtTime(0.001, t + 0.23);
      tone.connect(envelope).connect(master);
      const entry = { tone, envelope };
      clueTones.add(entry);
      tone.onended = () => { clueTones.delete(entry); tone.disconnect(); envelope.disconnect(); };
      tone.start(t); tone.stop(t + 0.24);
    }
  }
  function quietClue() {
    nextReplay = 0;
    for (const { tone, envelope } of clueTones) {
      envelope.disconnect();
      try { tone.stop(); } catch { /* already ended */ }
    }
    clueTones.clear();
  }
  return {
    ready: ctx.resume(),
    volume: (value) => {
      if (stopped) return;
      muted = value <= 0;
      if (muted) quietPeak();
      master.gain.setTargetAtTime(gainFor(value), ctx.currentTime, 0.04);
    },
    texture: (difference) => {
      if (!stopped) staticLayer.gain.gain.setTargetAtTime(0.09 + Math.min(16, Math.abs(difference)) / 16 * 0.19, ctx.currentTime, 0.20);
    },
    motion: (tilt, sweep, enabled = true) => {
      if (stopped) return false;
      const now = ctx.currentTime, strength = Math.max(Math.abs(tilt), Math.abs(sweep));
      staticLayer.filter.frequency.setTargetAtTime(950 * 1.85 ** tilt, now, 0.12);
      if (panner) panner.pan.setTargetAtTime(sweep * 0.8, now, 0.14);
      motionGain.gain.setTargetAtTime(1 + 0.25 * strength, now, 0.12);
      if (!enabled) {
        peakHeld = false;
        quietPeak();
      } else if (strength < 0.53) {
        peakHeld = false;
      } else if (strength >= 0.82 && !peakHeld) {
        peakHeld = true;
        playPeak(now);
      }
      return peakHeld;
    },
    playClue, quietClue,
    stop() {
      if (stopped) return;
      stopped = true;
      quietPeak();
      quietClue();
      master.disconnect();
      source.stop();
      ctx.close().catch(() => {});
    },
  };
}
