let ctx = null;
let masterGain = null;
let schedulerTimer = null;
let currentStep = 0;
let nextStepTime = 0;

const BPM = 130;
const STEP = (60 / BPM) / 4; // 16th note
const STEPS = 32;

// A minor pentatonic
const A2=110, E2=82.41, G2=98, C3=130.81, D3=146.83, E3=164.81, G3=196,
      A3=220, C4=261.63, D4=293.66, E4=329.63, G4=392, A4=440, C5=523.25, E5=659.25;

const BASS = [
  A2,0,0,0, 0,0,E3,0, A2,0,0,0, G2,0,0,0,
  C3,0,0,0, 0,0,G3,0, A2,0,E3,0, D3,0,A2,0,
];
const LEAD = [
  A4,0,E4,0, A4,0,C5,0, G4,0,E4,0, G4,0,A4,0,
  C5,0,A4,0, G4,0,E4,0, A4,0,C5,0, E5,0,A4,0,
];
const KICK  = [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0, 1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0];
const SNARE = [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0, 0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1];
const HIHAT = [1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0, 1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0];

function ensureCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function tone(freq, type, time, dur, vol) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g); g.connect(masterGain);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  g.gain.setValueAtTime(vol, time);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  osc.start(time); osc.stop(time + dur + 0.01);
}

function kick(time) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g); g.connect(masterGain);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
  g.gain.setValueAtTime(1.0, time);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
  osc.start(time); osc.stop(time + 0.21);
}

function hihat(time, vol = 0.1) {
  const len = Math.ceil(ctx.sampleRate * 0.04);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const flt = ctx.createBiquadFilter();
  flt.type = 'highpass'; flt.frequency.value = 8000;
  const g = ctx.createGain();
  src.connect(flt); flt.connect(g); g.connect(masterGain);
  g.gain.setValueAtTime(vol, time);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
  src.start(time); src.stop(time + 0.05);
}

function pad(time) {
  [A2, A3, E3, C3].forEach(freq => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(masterGain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    const dur = STEP * 16;
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.04, time + 0.4);
    g.gain.setValueAtTime(0.04, time + dur - 0.4);
    g.gain.linearRampToValueAtTime(0, time + dur);
    osc.start(time); osc.stop(time + dur + 0.01);
  });
}

function scheduleStep(s, time) {
  if (BASS[s])  tone(BASS[s], 'sawtooth', time, STEP * 1.6,  0.2);
  if (LEAD[s])  tone(LEAD[s], 'square',   time, STEP * 0.55, 0.08);
  if (KICK[s])  kick(time);
  if (SNARE[s]) { tone(200, 'sawtooth', time, 0.04, 0.1); hihat(time, 0.18); }
  if (HIHAT[s]) hihat(time, 0.09);
  if (s % 16 === 0) pad(time);
}

function tick() {
  const lookahead = ctx.currentTime + 0.12;
  while (nextStepTime < lookahead) {
    scheduleStep(currentStep % STEPS, nextStepTime);
    currentStep++;
    nextStepTime += STEP;
  }
}

export const music = {
  start() {
    if (schedulerTimer) return;
    ensureCtx();
    currentStep = 0;
    nextStepTime = ctx.currentTime + 0.05;
    tick();
    schedulerTimer = setInterval(tick, 25);
  },
  stop() {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  },
  setVolume(v) {
    if (masterGain && ctx) masterGain.gain.setTargetAtTime(Math.max(0.0001, v), ctx.currentTime, 0.05);
  },
  get playing() { return !!schedulerTimer; },
};
