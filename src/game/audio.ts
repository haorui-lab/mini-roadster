let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let engine: OscillatorNode | null = null;
let engineGain: GainNode | null = null;
let noise: AudioBufferSourceNode | null = null;
let noiseGain: GainNode | null = null;
let muted = false;

function graph() {
  if (ctx) return ctx;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new Ctx({ latencyHint: "interactive" });
  master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);

  engine = ctx.createOscillator();
  engine.type = "sawtooth";
  engine.frequency.value = 60;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 420;
  engineGain = ctx.createGain();
  engineGain.gain.value = 0;
  engine.connect(filter);
  filter.connect(engineGain);
  engineGain.connect(master);
  engine.start();

  const buffer = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const nFilter = ctx.createBiquadFilter();
  nFilter.type = "bandpass";
  nFilter.frequency.value = 900;
  noiseGain = ctx.createGain();
  noiseGain.gain.value = 0;
  noise.connect(nFilter);
  nFilter.connect(noiseGain);
  noiseGain.connect(master);
  noise.start();
  return ctx;
}

export function unlockAudio() {
  if (typeof window === "undefined") return;
  const audio = graph();
  if (audio.state === "suspended") void audio.resume();
}

export function resumeAudio() {
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

export function setMuted(next: boolean) {
  muted = next;
  if (!master || !ctx) return;
  master.gain.setTargetAtTime(next ? 0 : 0.8, ctx.currentTime, 0.03);
}

export function isMuted() {
  return muted;
}

export function updateEngine(speed: number, thrusting: boolean, drifting: boolean) {
  if (!ctx || !engine || !engineGain || !noiseGain) return;
  const rate = 52 + Math.min(160, Math.abs(speed) * 3.2) + (thrusting ? 40 : 0);
  engine.frequency.setTargetAtTime(rate, ctx.currentTime, 0.05);
  const vol = muted ? 0 : Math.min(0.18, 0.02 + Math.abs(speed) * 0.004 + (thrusting ? 0.05 : 0));
  engineGain.gain.setTargetAtTime(vol, ctx.currentTime, 0.05);
  noiseGain.gain.setTargetAtTime(muted ? 0 : thrusting || drifting ? 0.045 : 0, ctx.currentTime, 0.05);
}

function blip(freq: number, dur: number, type: OscillatorType, gain: number) {
  if (!ctx || !master || muted) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  osc.connect(g);
  g.connect(master);
  osc.start();
  osc.stop(ctx.currentTime + dur + 0.02);
}

export function playCoin(ring: boolean) {
  blip(ring ? 880 : 620, 0.12, "triangle", 0.16);
  blip(ring ? 1320 : 920, 0.16, "sine", 0.08);
}

export function playThud() {
  blip(90 + Math.random() * 30, 0.18, "sine", 0.2);
}

export function playBoost() {
  blip(220, 0.2, "square", 0.05);
}
