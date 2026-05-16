import { useState, useEffect, useRef, useCallback } from 'react';
import {
  GRID_W, GRID_H, BASE_SPEED, MIN_SPEED, FOODS_PER_SPEED_UP, PTS_PER_LEVEL,
  TIME_ATTACK_SEC, DIR, MODES, PU, PU_DURATION, PU_COLOR, SKINS,
  FOOD, FOOD_COLOR, FOOD_GLOW, FOOD_WEIGHTS,
  DASH_TICKS, DASH_COOLDOWN, HACK_DURATION, HACK_COOLDOWN,
} from '../constants/game';
import { audio, setSfxVolume } from '../utils/audio';
import { recordGameOver } from '../utils/storage';

// ── helpers ──────────────────────────────────────────────────────────────────

function rnd(snake, obstacles, pups, food) {
  let cell, tries = 0;
  do {
    cell = { x: Math.floor(Math.random() * GRID_W), y: Math.floor(Math.random() * GRID_H) };
    tries++;
  } while (tries < 400 && (
    snake.some(s => s.x === cell.x && s.y === cell.y) ||
    obstacles.some(o => o.x === cell.x && o.y === cell.y) ||
    (food && food.x === cell.x && food.y === cell.y) ||
    (pups && pups.some(p => p.x === cell.x && p.y === cell.y))
  ));
  return cell;
}

function rndFoodType() {
  const entries = Object.entries(FOOD_WEIGHTS);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [type, w] of entries) {
    r -= w;
    if (r <= 0) return type;
  }
  return FOOD.DATA;
}

function mkObstacles(level, snake, food) {
  const count = Math.min((level - 1) * 2, 16);
  const obs = [];
  for (let i = 0; i < count; i++) obs.push(rnd(snake, obs, [], food));
  return obs;
}

function mkParticles(gx, gy, color, cs, n = 10) {
  return Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.3;
    const spd = 2 + Math.random() * 4;
    return {
      x: gx * cs + cs / 2, y: gy * cs + cs / 2,
      vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      life: 1, decay: 0.025 + Math.random() * 0.025,
      color, size: 2 + Math.random() * 3,
    };
  });
}

function calcSpeed(foodEaten, activePU, overclockUntil) {
  const reductions = Math.floor(foodEaten / FOODS_PER_SPEED_UP);
  let spd = Math.max(MIN_SPEED, BASE_SPEED - reductions * 12);
  if (activePU?.type === PU.TURBO) spd = Math.max(30, Math.floor(spd / 2));
  if (overclockUntil && Date.now() < overclockUntil) spd = Math.max(30, Math.floor(spd / 2));
  return spd;
}

function getSkin(id) {
  return SKINS.find(s => s.id === id) || SKINS[0];
}

// ── renderer ─────────────────────────────────────────────────────────────────

function render(ctx, state, skinId, ts, cs) {
  const W = GRID_W * cs, H = GRID_H * cs;
  const skin = getSkin(skinId);

  // ── screen shake ────────────────────────────────────────────────────────────
  ctx.save();
  if (state.screenShake > 0) {
    ctx.translate(
      (Math.random() - 0.5) * state.screenShake * 1.8,
      (Math.random() - 0.5) * state.screenShake * 1.8
    );
  }

  // ── background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // ── matrix rain ─────────────────────────────────────────────────────────────
  if (!state.rain) {
    const cols = Math.ceil(W / (cs * 0.75));
    state.rain = Array.from({ length: cols }, () => ({
      y: Math.random() * H,
      speed: 0.4 + Math.random() * 1.2,
      bright: 0.25 + Math.random() * 0.55,
    }));
  }
  ctx.save();
  ctx.font = `${Math.round(cs * 0.65)}px monospace`;
  ctx.textBaseline = 'top';
  state.rain.forEach((drop, i) => {
    const char = String.fromCharCode(0x30A0 + Math.floor((ts / 90 + i * 17) % 96));
    ctx.globalAlpha = drop.bright * 0.22;
    ctx.fillStyle = '#00FF41';
    ctx.fillText(char, i * (cs * 0.75), drop.y);
    drop.y += drop.speed;
    if (drop.y > H) { drop.y = -cs; drop.bright = 0.25 + Math.random() * 0.55; }
  });
  ctx.restore();

  // ── turbo speed lines ────────────────────────────────────────────────────────
  if (state.activePU?.type === PU.TURBO || (state.overclockUntil && Date.now() < state.overclockUntil)) {
    const lc = state.activePU?.type === PU.TURBO ? '#FF8800' : '#FF4400';
    ctx.save();
    ctx.strokeStyle = lc;
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const x = ((ts * 5 + i * (W / 9)) % (W + 40)) - 20;
      ctx.globalAlpha = 0.12 + 0.06 * Math.sin(ts / 40 + i);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 22, H); ctx.stroke();
    }
    ctx.restore();
  }

  // ── grid ────────────────────────────────────────────────────────────────────
  const gridA = 0.04 + state.gridPulse * 0.14;
  ctx.strokeStyle = `rgba(0,255,65,${gridA.toFixed(3)})`;
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= GRID_W; x++) { ctx.beginPath(); ctx.moveTo(x * cs, 0); ctx.lineTo(x * cs, H); ctx.stroke(); }
  for (let y = 0; y <= GRID_H; y++) { ctx.beginPath(); ctx.moveTo(0, y * cs); ctx.lineTo(W, y * cs); ctx.stroke(); }

  // ── static obstacles ────────────────────────────────────────────────────────
  state.obstacles.forEach(o => {
    ctx.save();
    ctx.shadowBlur = 8; ctx.shadowColor = '#FF0044';
    ctx.fillStyle = '#1a0008';
    ctx.fillRect(o.x * cs + 1, o.y * cs + 1, cs - 2, cs - 2);
    ctx.strokeStyle = '#FF0044'; ctx.lineWidth = 1;
    ctx.strokeRect(o.x * cs + 1.5, o.y * cs + 1.5, cs - 3, cs - 3);
    ctx.restore();
  });

  // ── dynamic walls ────────────────────────────────────────────────────────────
  if (state.dynWalls.length > 0) {
    const vis = state.wallsVisible;
    const wa = vis ? (0.75 + 0.25 * Math.sin(ts / 90)) : (0.18 + 0.12 * Math.sin(ts / 220));
    state.dynWalls.forEach(w => {
      ctx.save();
      ctx.globalAlpha = wa;
      ctx.shadowBlur = vis ? 14 : 4;
      ctx.shadowColor = '#FF6600';
      ctx.fillStyle = vis ? '#221100' : '#110800';
      ctx.fillRect(w.x * cs + 1, w.y * cs + 1, cs - 2, cs - 2);
      ctx.strokeStyle = vis ? '#FF6600' : '#553300';
      ctx.lineWidth = 1;
      ctx.strokeRect(w.x * cs + 1.5, w.y * cs + 1.5, cs - 3, cs - 3);
      ctx.restore();
    });
  }

  // ── food ────────────────────────────────────────────────────────────────────
  const pulse = 0.65 + 0.35 * Math.sin(ts / 280);
  const fx = state.food.x * cs + cs / 2, fy = state.food.y * cs + cs / 2;
  const fc = FOOD_COLOR[state.foodType] || '#FF2244';
  const fg = FOOD_GLOW[state.foodType] || '#FF2244';
  ctx.save();
  ctx.shadowBlur = 28 * pulse; ctx.shadowColor = fg;
  ctx.strokeStyle = `${fc}55`;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(fx, fy, (cs / 2 + 2) * pulse, 0, Math.PI * 2); ctx.stroke();
  ctx.shadowBlur = 18 * pulse;
  ctx.fillStyle = fc;
  ctx.beginPath(); ctx.arc(fx, fy, (cs / 2 - 2) * pulse, 0, Math.PI * 2); ctx.fill();
  if (state.foodType !== FOOD.DATA) {
    ctx.globalAlpha = 0.9; ctx.fillStyle = '#000';
    ctx.shadowBlur = 0;
    ctx.font = `bold ${Math.round(cs * 0.42)}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(state.foodType[0].toUpperCase(), fx, fy);
  }
  ctx.restore();

  // ── power-ups ────────────────────────────────────────────────────────────────
  state.powerUps.forEach(p => {
    const pl = 0.6 + 0.4 * Math.sin(ts / 180 + p.x * 0.5);
    ctx.save();
    ctx.shadowBlur = 18 * pl; ctx.shadowColor = PU_COLOR[p.type];
    ctx.fillStyle = PU_COLOR[p.type];
    ctx.beginPath();
    const cx = p.x * cs + cs / 2, cy = p.y * cs + cs / 2;
    const r1 = (cs / 2 - 2) * pl, r2 = r1 * 0.45;
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10 - Math.PI / 2;
      const r = i % 2 === 0 ? r1 : r2;
      if (i === 0) ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      else ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  });

  // ── holographic snake trail ──────────────────────────────────────────────────
  state.trail.forEach((seg, i) => {
    const alpha = (1 - (i + 1) / (state.trail.length + 1)) * 0.38;
    const hue = (ts / 18 + i * 40) % 360;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `hsl(${hue}, 100%, 65%)`;
    ctx.shadowBlur = 10; ctx.shadowColor = `hsl(${hue}, 100%, 65%)`;
    const sz = cs * Math.max(0.3, 1 - i * 0.1);
    const off = (cs - sz) / 2;
    ctx.fillRect(seg.x * cs + off, seg.y * cs + off, sz, sz);
    ctx.restore();
  });

  // ── snake ────────────────────────────────────────────────────────────────────
  const isShielded = state.activePU?.type === PU.SHIELD;
  const isHack = state.hackActive;
  const headColor = isHack ? '#CC44FF' : isShielded ? '#00FFFF' : skin.head;
  const bodyColor = isHack ? '#880099' : isShielded ? '#008888' : skin.body;
  const glowColor = isHack ? '#CC44FF' : isShielded ? '#00FFFF' : skin.glow;

  state.snake.forEach((seg, i) => {
    ctx.save();
    const hackFlicker = isHack ? (0.5 + 0.5 * Math.sin(ts / 30 + i)) : 1;
    ctx.shadowBlur = i === 0 ? 22 : 10;
    ctx.shadowColor = glowColor;
    const alpha = Math.max(0.2, 1 - i * 0.032) * hackFlicker;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = i === 0 ? headColor : bodyColor;
    const pad = i === 0 ? 0 : 1;
    ctx.fillRect(seg.x * cs + pad, seg.y * cs + pad, cs - pad * 2, cs - pad * 2);
    if (i === 0) {
      ctx.globalAlpha = 0.35 * hackFlicker;
      ctx.fillStyle = '#fff';
      ctx.fillRect(seg.x * cs + 2, seg.y * cs + 2, cs * 0.35, cs * 0.2);
    }
    ctx.restore();
  });

  // ── snake eyes ───────────────────────────────────────────────────────────────
  if (state.snake.length > 0) {
    const h = state.snake[0];
    const d = state.dir;
    ctx.fillStyle = '#000';
    const ex = h.x * cs + cs / 2, ey = h.y * cs + cs / 2;
    const er = cs * 0.12;
    const offset = cs * 0.22;
    const perp = { x: -d.y, y: d.x };
    [1, -1].forEach(s => {
      ctx.beginPath();
      ctx.arc(ex + d.x * offset + perp.x * offset * s, ey + d.y * offset + perp.y * offset * s, er, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ── hack mode glitch visual ──────────────────────────────────────────────────
  if (state.hackActive) {
    ctx.save();
    for (let i = 0; i < 4; i++) {
      const gy = Math.floor(Math.random() * GRID_H) * cs;
      const shift = (Math.random() - 0.5) * cs * 0.6;
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = i % 2 === 0 ? '#CC44FF' : '#00FFFF';
      ctx.fillRect(shift, gy, W, cs * 0.8);
    }
    ctx.globalAlpha = 0.45 + 0.3 * Math.sin(ts / 35);
    ctx.strokeStyle = '#CC44FF';
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 12; ctx.shadowColor = '#CC44FF';
    ctx.strokeRect(1, 1, W - 2, H - 2);
    ctx.restore();
  }

  // ── inverted controls indicator ──────────────────────────────────────────────
  if (state.invertUntil && Date.now() < state.invertUntil) {
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(ts / 60);
    ctx.strokeStyle = '#22FF66';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(2, 2, W - 4, H - 4);
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ── particles ────────────────────────────────────────────────────────────────
  state.particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life * 0.9;
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 8; ctx.shadowColor = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });

  // ── floating texts ───────────────────────────────────────────────────────────
  state.floatTexts.forEach(ft => {
    ctx.save();
    ctx.globalAlpha = ft.life > 0.7 ? 1 : ft.life / 0.7;
    ctx.fillStyle = ft.color;
    ctx.shadowBlur = 14; ctx.shadowColor = ft.color;
    ctx.font = `bold ${Math.round(cs * ft.size)}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const yOff = (1 - ft.life) * cs * 3.5;
    ctx.fillText(ft.text, ft.gx * cs + cs / 2, ft.gy * cs - yOff);
    ctx.restore();
  });

  // ── level flash ──────────────────────────────────────────────────────────────
  if (state.levelFlash > 0) {
    ctx.save();
    ctx.globalAlpha = state.levelFlash * 0.38;
    ctx.fillStyle = '#00FF41';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ── vignette ────────────────────────────────────────────────────────────────
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.28, W / 2, H / 2, Math.max(W, H) * 0.82);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // ── scanlines ────────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.07)';
  for (let y = 2; y < H; y += 4) ctx.fillRect(0, y, W, 1);

  // ── death flash ──────────────────────────────────────────────────────────────
  if (state.deathFlash > 0) {
    ctx.save();
    ctx.globalAlpha = (state.deathFlash / 12) * 0.65;
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ── pause overlay ────────────────────────────────────────────────────────────
  if (state.paused && !state.dead) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#00FF41';
    ctx.shadowBlur = 20; ctx.shadowColor = '#00FF41';
    ctx.font = `bold ${cs * 1.2}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', W / 2, H / 2);
    ctx.restore();
  }

  // ── active power-up bar ──────────────────────────────────────────────────────
  if (state.activePU) {
    const elapsed = Date.now() - state.activePU.startedAt;
    const total = PU_DURATION[state.activePU.type];
    const pct = Math.max(0, 1 - elapsed / total);
    ctx.save();
    ctx.fillStyle = PU_COLOR[state.activePU.type] + '44';
    ctx.fillRect(0, H - 4, W, 4);
    ctx.shadowBlur = 8; ctx.shadowColor = PU_COLOR[state.activePU.type];
    ctx.fillStyle = PU_COLOR[state.activePU.type];
    ctx.fillRect(0, H - 4, W * pct, 4);
    ctx.restore();
  }

  ctx.restore(); // end screen shake
}

// ── initial state ─────────────────────────────────────────────────────────────

function mkState(mode, wallsOn) {
  const snake = [{ x: 12, y: 10 }, { x: 11, y: 10 }, { x: 10, y: 10 }];
  const food = { x: 16, y: 10 };
  return {
    snake, dir: DIR.RIGHT, nextDir: DIR.RIGHT,
    food, foodType: FOOD.DATA,
    powerUps: [], activePU: null,
    obstacles: [], score: 0, level: 1,
    foodEaten: 0,
    timeLeft: mode === MODES.TIME_ATTACK ? TIME_ATTACK_SEC : null,
    _lastTs: null, dead: false, paused: false,
    particles: [], deathFlash: 0, mode,
    floatTexts: [], gridPulse: 0, levelFlash: 0, screenShake: 0,
    // new fields
    combo: 0,
    dirChangedSinceEat: false,
    invertUntil: 0,
    overclockUntil: 0,
    dashAvailAt: 0,
    hackActive: false,
    hackTimer: 0,
    hackAvailAt: 0,
    trail: [],
    dynWalls: [],
    wallsVisible: false,
    wallToggleAt: Date.now() + 5000,
    wallsOn: wallsOn !== false,
    rain: null,
  };
}

// ── hook ──────────────────────────────────────────────────────────────────────

export function useGameEngine({ mode, canvasRef, skinId, sfxVolume, wallsOn, onDead }) {
  const stRef = useRef(null);
  const rafRef = useRef(null);
  const lastTickRef = useRef(null);
  const onDeadRef = useRef(onDead);
  const csRef = useRef(14);
  const tickRef = useRef(null);
  const killRef = useRef(null);

  useEffect(() => { onDeadRef.current = onDead; }, [onDead]);
  useEffect(() => { setSfxVolume((sfxVolume ?? 80) / 100); }, [sfxVolume]);

  const [ui, setUi] = useState({
    score: 0, level: 1, timeLeft: null, paused: false, activePU: null, dead: false,
    combo: 0, hackActive: false, hackAvailAt: 0, dashAvailAt: 0,
  });

  const syncUi = useCallback(() => {
    const s = stRef.current;
    if (!s) return;
    setUi({
      score: s.score, level: s.level, timeLeft: s.timeLeft,
      paused: s.paused, activePU: s.activePU, dead: s.dead,
      combo: s.combo, hackActive: s.hackActive,
      hackAvailAt: s.hackAvailAt, dashAvailAt: s.dashAvailAt,
    });
  }, []);

  const setDir = useCallback((dir) => {
    const s = stRef.current;
    if (!s || s.dead || s.paused) return;
    // invert controls if virus active
    const d = (s.invertUntil && Date.now() < s.invertUntil)
      ? { x: -dir.x, y: -dir.y }
      : dir;
    if (d.x === -s.dir.x && d.y === -s.dir.y) return;
    if (d.x !== s.dir.x || d.y !== s.dir.y) s.dirChangedSinceEat = true;
    s.nextDir = d;
  }, []);

  const togglePause = useCallback(() => {
    const s = stRef.current;
    if (!s || s.dead) return;
    s.paused = !s.paused;
    if (!s.paused) s._lastTs = null;
    syncUi();
  }, [syncUi]);

  const triggerDash = useCallback(() => {
    const s = stRef.current;
    if (!s || s.dead || s.paused) return;
    if (Date.now() < s.dashAvailAt) return;
    s.dashAvailAt = Date.now() + DASH_COOLDOWN;
    for (let i = 0; i < DASH_TICKS; i++) {
      if (!s.dead && tickRef.current) tickRef.current(s);
    }
    lastTickRef.current = null;
    setUi(u => ({ ...u, score: s.score, level: s.level, dashAvailAt: s.dashAvailAt }));
  }, []);

  const triggerHack = useCallback(() => {
    const s = stRef.current;
    if (!s || s.dead || s.paused) return;
    if (Date.now() < s.hackAvailAt) return;
    s.hackActive = true;
    s.hackTimer = Date.now() + HACK_DURATION;
    s.hackAvailAt = Date.now() + HACK_COOLDOWN;
    s.screenShake = 5;
    s.floatTexts.push({ gx: GRID_W / 2 - 2, gy: GRID_H / 2 - 1, text: 'HACK MODE!', life: 1.2, color: '#CC44FF', size: 1.0 });
    audio.powerup();
    setUi(u => ({ ...u, hackActive: true, hackAvailAt: s.hackAvailAt }));
  }, []);

  const init = useCallback(() => {
    stRef.current = mkState(mode, wallsOn);
    lastTickRef.current = null;
    setUi({
      score: 0, level: 1,
      timeLeft: mode === MODES.TIME_ATTACK ? TIME_ATTACK_SEC : null,
      paused: false, activePU: null, dead: false,
      combo: 0, hackActive: false, hackAvailAt: 0, dashAvailAt: 0,
    });
  }, [mode, wallsOn]);

  useEffect(() => {
    init();

    const cs = (() => {
      const isMob = window.innerWidth < 600;
      const maxW = window.innerWidth - (isMob ? 16 : 80);
      const maxH = window.innerHeight - (isMob ? 310 : 150);
      const maxCs = isMob ? 26 : 44;
      return Math.max(14, Math.min(Math.floor(maxW / GRID_W), Math.floor(maxH / GRID_H), maxCs));
    })();
    csRef.current = cs;

    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = GRID_W * cs * dpr;
      canvas.height = GRID_H * cs * dpr;
      canvas.style.width = `${GRID_W * cs}px`;
      canvas.style.height = `${GRID_H * cs}px`;
      const ctx2d = canvas.getContext('2d');
      ctx2d.scale(dpr, dpr);
    }

    // ── kill ────────────────────────────────────────────────────────────────────
    killRef.current = function kill(s) {
      if (s.dead) return;
      s.dead = true;
      s.deathFlash = 12;
      s.screenShake = 16;
      audio.die();
      if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
      const result = recordGameOver(s.score);
      setUi(u => ({ ...u, dead: true }));
      setTimeout(() => onDeadRef.current?.({ score: s.score, ...result }), 600);
    };

    // ── tick ────────────────────────────────────────────────────────────────────
    tickRef.current = function tick(s) {
      s.dir = s.nextDir;

      // save trail
      s.trail = [{ x: s.snake[0].x, y: s.snake[0].y }, ...s.trail].slice(0, 8);

      let hx = s.snake[0].x + s.dir.x;
      let hy = s.snake[0].y + s.dir.y;

      const isShield = s.activePU?.type === PU.SHIELD;
      const canPassWall = !s.wallsOn || s.mode === MODES.INFINITE || isShield || s.hackActive;

      // wall / boundary check
      const outOfBounds = hx < 0 || hx >= GRID_W || hy < 0 || hy >= GRID_H;
      if (outOfBounds) {
        if (canPassWall) {
          hx = ((hx % GRID_W) + GRID_W) % GRID_W;
          hy = ((hy % GRID_H) + GRID_H) % GRID_H;
        } else { killRef.current(s); return; }
      }

      // self / obstacle collision
      const hitSelf = s.snake.some(seg => seg.x === hx && seg.y === hy);
      const hitObs  = s.obstacles.some(o => o.x === hx && o.y === hy);
      const hitDyn  = s.wallsVisible && s.dynWalls.some(w => w.x === hx && w.y === hy);
      if ((hitSelf || hitObs || hitDyn) && !isShield && !s.hackActive) {
        killRef.current(s); return;
      }

      s.snake = [{ x: hx, y: hy }, ...s.snake];

      // ── food collision ────────────────────────────────────────────────────────
      if (hx === s.food.x && hy === s.food.y) {
        // combo
        const comboMult = Math.min(s.combo + 1, 5);
        const puMult = s.activePU?.type === PU.X2 ? 2 : 1;
        const pts = 10 * comboMult * puMult;
        s.score += pts;
        s.foodEaten++;

        if (s.dirChangedSinceEat) {
          s.combo = 0;
        } else {
          s.combo = Math.min(s.combo + 1, 4);
        }
        s.dirChangedSinceEat = false;

        audio.eat();
        s.particles.push(...mkParticles(hx, hy, FOOD_COLOR[s.foodType] || '#FF2244', cs));
        s.gridPulse = 1;

        // float text
        const comboText = comboMult > 1 ? `×${comboMult} ` : '';
        s.floatTexts.push({ gx: hx, gy: hy, text: `${comboText}+${pts}`, life: 1, color: comboMult > 1 ? '#FF8800' : '#FFD700', size: 0.75 });

        // food type effect
        if (s.foodType === FOOD.VIRUS) {
          s.invertUntil = Date.now() + 5000;
          s.floatTexts.push({ gx: GRID_W / 2 - 1, gy: GRID_H / 2, text: 'VIRUS!', life: 1.2, color: '#22FF66', size: 0.9 });
          s.screenShake = 6;
        } else if (s.foodType === FOOD.OVERCLOCK) {
          s.overclockUntil = Date.now() + 5000;
          s.floatTexts.push({ gx: hx, gy: hy - 1, text: 'OVERCLOCK!', life: 1.1, color: '#FF8800', size: 0.7 });
        } else if (s.foodType === FOOD.GLITCH) {
          // teleport head to random position
          const newPos = rnd(s.snake.slice(1), [...s.obstacles, ...s.dynWalls], s.powerUps, null);
          s.snake[0] = newPos;
          s.screenShake = 8;
          s.floatTexts.push({ gx: newPos.x, gy: newPos.y, text: 'GLITCH!', life: 1.2, color: '#CC44FF', size: 0.85 });
          s.particles.push(...mkParticles(newPos.x, newPos.y, '#CC44FF', cs, 14));
        }

        // level up
        const newLevel = Math.floor(s.score / PTS_PER_LEVEL) + 1;
        if (newLevel > s.level) {
          s.level = newLevel;
          s.obstacles = mkObstacles(s.level, s.snake, s.food);
          s.levelFlash = 1;
          s.screenShake = 5;
          s.floatTexts.push({ gx: GRID_W / 2 - 0.5, gy: GRID_H / 2 - 1, text: `LEVEL ${s.level}`, life: 1, color: '#00FF41', size: 1.0 });
          audio.levelup();
          // init dynamic walls at level 3
          if (s.level >= 3 && s.dynWalls.length === 0) {
            s.wallToggleAt = Date.now() + 3000;
          }
        }

        // pick next food
        s.food = rnd(s.snake, s.obstacles, s.powerUps, null);
        s.foodType = rndFoodType();

        // spawn power-up
        if (Math.random() < 0.18 && s.powerUps.length < 2) {
          const types = Object.values(PU);
          const type = types[Math.floor(Math.random() * types.length)];
          s.powerUps.push({ ...rnd(s.snake, s.obstacles, s.powerUps, s.food), type, expiresAt: Date.now() + 12000 });
        }

        setUi(u => ({ ...u, score: s.score, level: s.level, combo: s.combo }));
      } else {
        s.snake.pop();
      }

      // ── power-up pickup ───────────────────────────────────────────────────────
      const puIdx = s.powerUps.findIndex(p => p.x === hx && p.y === hy);
      if (puIdx >= 0) {
        const pu = s.powerUps.splice(puIdx, 1)[0];
        s.activePU = { type: pu.type, startedAt: Date.now(), expiresAt: Date.now() + PU_DURATION[pu.type] };
        audio.powerup();
        s.particles.push(...mkParticles(hx, hy, PU_COLOR[pu.type], cs, 14));
        setUi(u => ({ ...u, activePU: s.activePU }));
      }

      // expire field power-ups
      s.powerUps = s.powerUps.filter(p => Date.now() < p.expiresAt);
    };

    // ── animation loop ──────────────────────────────────────────────────────────
    const loop = (ts) => {
      const s = stRef.current;
      if (!s) { rafRef.current = requestAnimationFrame(loop); return; }

      // particles
      s.particles = s.particles
        .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vx: p.vx * 0.93, vy: p.vy * 0.93, life: p.life - p.decay }))
        .filter(p => p.life > 0);

      // float texts
      s.floatTexts = s.floatTexts
        .map(ft => ({ ...ft, life: ft.life - 0.018 }))
        .filter(ft => ft.life > 0);

      // decay effects
      if (s.deathFlash > 0)  s.deathFlash  = Math.max(0, s.deathFlash  - 0.6);
      if (s.screenShake > 0) s.screenShake = Math.max(0, s.screenShake - 0.65);
      if (s.gridPulse > 0)   s.gridPulse   = Math.max(0, s.gridPulse   - 0.045);
      if (s.levelFlash > 0)  s.levelFlash  = Math.max(0, s.levelFlash  - 0.055);

      // time attack countdown
      if (!s.paused && !s.dead && s.mode === MODES.TIME_ATTACK && s.timeLeft !== null) {
        if (s._lastTs !== null) {
          const prevFloor = Math.floor(s.timeLeft);
          s.timeLeft = Math.max(0, s.timeLeft - (ts - s._lastTs) / 1000);
          if (s.timeLeft <= 0) { killRef.current(s); rafRef.current = requestAnimationFrame(loop); return; }
          if (Math.floor(s.timeLeft) !== prevFloor) {
            setUi(u => ({ ...u, timeLeft: s.timeLeft }));
          }
        }
        s._lastTs = ts;
      }

      // expire active PU
      if (s.activePU && Date.now() >= s.activePU.expiresAt) {
        s.activePU = null;
        setUi(u => ({ ...u, activePU: null }));
      }

      // hack mode expiry
      if (s.hackActive && Date.now() >= s.hackTimer) {
        s.hackActive = false;
        setUi(u => ({ ...u, hackActive: false }));
      }

      // dynamic wall toggle (level 3+)
      if (!s.dead && !s.paused && s.level >= 3 && Date.now() >= s.wallToggleAt) {
        s.wallsVisible = !s.wallsVisible;
        s.wallToggleAt = Date.now() + (s.wallsVisible ? 3000 : 2500);
        if (s.wallsVisible) {
          const numWalls = Math.min(s.level - 2, 4);
          s.dynWalls = [];
          for (let i = 0; i < numWalls; i++) {
            s.dynWalls.push(rnd(s.snake, [...s.obstacles, ...s.dynWalls], s.powerUps, s.food));
          }
        }
      }

      // game tick
      if (!s.paused && !s.dead) {
        if (lastTickRef.current === null) lastTickRef.current = ts;
        if (ts - lastTickRef.current >= calcSpeed(s.foodEaten, s.activePU, s.overclockUntil)) {
          lastTickRef.current = ts;
          tickRef.current(s);
        }
      }

      // render
      if (canvasRef.current) {
        const ctx2d = canvasRef.current.getContext('2d');
        render(ctx2d, s, skinId, ts, cs);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [mode, canvasRef, skinId, wallsOn, init, syncUi]);

  return { ...ui, setDir, togglePause, triggerDash, triggerHack, restart: init };
}
