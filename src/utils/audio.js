let ctx = null;
let sfxGain = null;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    sfxGain = ctx.createGain();
    sfxGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function setSfxVolume(v) {
  if (sfxGain && ctx) sfxGain.gain.setTargetAtTime(Math.max(0.0001, v), ctx.currentTime, 0.05);
}

function tone(freq, type, dur, vol = 0.25, start = 0) {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + start);
    gain.gain.setValueAtTime(vol, c.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
    osc.start(c.currentTime + start);
    osc.stop(c.currentTime + start + dur);
  } catch {}
}

export const audio = {
  eat() {
    tone(440, 'square', 0.08, 0.3);
    tone(660, 'square', 0.08, 0.2, 0.06);
  },
  powerup() {
    [330, 440, 550, 660, 880].forEach((f, i) => tone(f, 'square', 0.12, 0.25, i * 0.06));
  },
  levelup() {
    [440, 554, 659, 880].forEach((f, i) => tone(f, 'square', 0.18, 0.3, i * 0.08));
  },
  die() {
    [440, 330, 220, 110].forEach((f, i) => tone(f, 'sawtooth', 0.22, 0.35, i * 0.1));
  },
};
