import { useState, useEffect, useRef, useCallback } from 'react';
import { GRID_W, GRID_H, BASE_SPEED, MIN_SPEED, FOODS_PER_SPEED_UP, PTS_PER_LEVEL, TIME_ATTACK_SEC, DIR, MODES, PU, PU_DURATION, PU_COLOR, SKINS } from '../constants/game';
import { audio } from '../utils/audio';
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

function calcSpeed(foodEaten, activePU) {
  const reductions = Math.floor(foodEaten / FOODS_PER_SPEED_UP);
  let spd = Math.max(MIN_SPEED, BASE_SPEED - reductions * 12);
  if (activePU?.type === PU.TURBO) spd = Math.max(30, Math.floor(spd / 2));
  return spd;
}

function getSkin(skins, id) {
  return SKINS.find(s => s.id === id) || SKINS[0];
}

// ── renderer ─────────────────────────────────────────────────────────────────

function render(ctx, state, skinId, ts, cs) {
  const W = GRID_W * cs, H = GRID_H * cs;
  const skin = getSkin(null, skinId);

  // background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // grid
  ctx.strokeStyle = 'rgba(0,255,65,0.04)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= GRID_W; x++) { ctx.beginPath(); ctx.moveTo(x * cs, 0); ctx.lineTo(x * cs, H); ctx.stroke(); }
  for (let y = 0; y <= GRID_H; y++) { ctx.beginPath(); ctx.moveTo(0, y * cs); ctx.lineTo(W, y * cs); ctx.stroke(); }

  // obstacles
  state.obstacles.forEach(o => {
    ctx.save();
    ctx.shadowBlur = 8; ctx.shadowColor = '#FF0044';
    ctx.fillStyle = '#1a0008';
    ctx.fillRect(o.x * cs + 1, o.y * cs + 1, cs - 2, cs - 2);
    ctx.strokeStyle = '#FF0044'; ctx.lineWidth = 1;
    ctx.strokeRect(o.x * cs + 1.5, o.y * cs + 1.5, cs - 3, cs - 3);
    ctx.restore();
  });

  // food
  const pulse = 0.65 + 0.35 * Math.sin(ts / 280);
  ctx.save();
  ctx.shadowBlur = 18 * pulse; ctx.shadowColor = '#FF2244';
  ctx.fillStyle = '#FF2244';
  ctx.beginPath();
  ctx.arc(state.food.x * cs + cs / 2, state.food.y * cs + cs / 2, (cs / 2 - 2) * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // power-ups
  state.powerUps.forEach(p => {
    const pl = 0.6 + 0.4 * Math.sin(ts / 180 + p.x * 0.5);
    ctx.save();
    ctx.shadowBlur = 14 * pl; ctx.shadowColor = PU_COLOR[p.type];
    ctx.fillStyle = PU_COLOR[p.type];
    // star shape
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

  // snake
  const isShielded = state.activePU?.type === PU.SHIELD;
  const headColor = isShielded ? '#00FFFF' : skin.head;
  const bodyColor = isShielded ? '#008888' : skin.body;
  const glowColor = isShielded ? '#00FFFF' : skin.glow;

  state.snake.forEach((seg, i) => {
    ctx.save();
    ctx.shadowBlur = i === 0 ? 16 : 8;
    ctx.shadowColor = glowColor;
    const alpha = Math.max(0.25, 1 - i * 0.035);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = i === 0 ? headColor : bodyColor;
    const pad = i === 0 ? 0 : 1;
    ctx.fillRect(seg.x * cs + pad, seg.y * cs + pad, cs - pad * 2, cs - pad * 2);
    ctx.restore();
  });

  // snake eyes
  if (state.snake.length > 0) {
    const h = state.snake[0];
    const d = state.dir;
    ctx.fillStyle = '#000';
    const ex = h.x * cs + cs / 2, ey = h.y * cs + cs / 2;
    const er = cs * 0.12;
    const offset = cs * 0.22;
    const perp = { x: -d.y, y: d.x };
    [[1], [-1]].forEach(([s]) => {
      ctx.beginPath();
      ctx.arc(ex + d.x * offset + perp.x * offset * s, ey + d.y * offset + perp.y * offset * s, er, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // particles
  state.particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life * 0.9;
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 6; ctx.shadowColor = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // death flash
  if (state.deathFlash > 0) {
    ctx.save();
    ctx.globalAlpha = (state.deathFlash / 12) * 0.6;
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // pause overlay
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

  // active power-up bar
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
}

// ── initial state ─────────────────────────────────────────────────────────────

function mkState(mode) {
  const snake = [{ x: 12, y: 10 }, { x: 11, y: 10 }, { x: 10, y: 10 }];
  const food = { x: 16, y: 10 };
  return {
    snake, dir: DIR.RIGHT, nextDir: DIR.RIGHT,
    food, powerUps: [], activePU: null,
    obstacles: [], score: 0, level: 1,
    foodEaten: 0,
    timeLeft: mode === MODES.TIME_ATTACK ? TIME_ATTACK_SEC : null,
    _lastTs: null, dead: false, paused: false,
    particles: [], deathFlash: 0, mode,
  };
}

// ── hook ──────────────────────────────────────────────────────────────────────

export function useGameEngine({ mode, canvasRef, skinId, soundOn, onDead }) {
  const stRef = useRef(null);
  const rafRef = useRef(null);
  const lastTickRef = useRef(null);
  const onDeadRef = useRef(onDead);
  const soundRef = useRef(soundOn);
  useEffect(() => { onDeadRef.current = onDead; }, [onDead]);
  useEffect(() => { soundRef.current = soundOn; }, [soundOn]);

  const [ui, setUi] = useState({ score: 0, level: 1, timeLeft: null, paused: false, activePU: null, dead: false });

  const syncUi = useCallback(() => {
    const s = stRef.current;
    if (!s) return;
    setUi({ score: s.score, level: s.level, timeLeft: s.timeLeft, paused: s.paused, activePU: s.activePU, dead: s.dead });
  }, []);

  const init = useCallback(() => {
    stRef.current = mkState(mode);
    lastTickRef.current = null;
    setUi({ score: 0, level: 1, timeLeft: mode === MODES.TIME_ATTACK ? TIME_ATTACK_SEC : null, paused: false, activePU: null, dead: false });
  }, [mode]);

  const setDir = useCallback((dir) => {
    const s = stRef.current;
    if (!s || s.dead || s.paused) return;
    if (dir.x === -s.dir.x && dir.y === -s.dir.y) return;
    s.nextDir = dir;
  }, []);

  const togglePause = useCallback(() => {
    const s = stRef.current;
    if (!s || s.dead) return;
    s.paused = !s.paused;
    if (!s.paused) s._lastTs = null;
    syncUi();
  }, [syncUi]);

  useEffect(() => {
    init();
    const cs = (() => {
      const maxW = Math.min(window.innerWidth - 32, 560);
      const maxH = Math.min(window.innerHeight - 180, 560);
      return Math.max(14, Math.min(Math.floor(maxW / GRID_W), Math.floor(maxH / GRID_H), 28));
    })();

    // set canvas size
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

    const loop = (ts) => {
      const s = stRef.current;
      if (!s) { rafRef.current = requestAnimationFrame(loop); return; }

      // particles
      s.particles = s.particles
        .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vx: p.vx * 0.93, vy: p.vy * 0.93, life: p.life - p.decay }))
        .filter(p => p.life > 0);

      // death flash
      if (s.deathFlash > 0) s.deathFlash -= 0.6;

      // time attack countdown
      if (!s.paused && !s.dead && s.mode === MODES.TIME_ATTACK && s.timeLeft !== null) {
        if (s._lastTs !== null) {
          s.timeLeft = Math.max(0, s.timeLeft - (ts - s._lastTs) / 1000);
          if (s.timeLeft <= 0) { kill(s); rafRef.current = requestAnimationFrame(loop); return; }
        }
        s._lastTs = ts;
      }

      // expire active PU
      if (s.activePU && Date.now() >= s.activePU.expiresAt) {
        s.activePU = null;
        setUi(u => ({ ...u, activePU: null }));
      }

      // game tick
      if (!s.paused && !s.dead) {
        if (lastTickRef.current === null) lastTickRef.current = ts;
        if (ts - lastTickRef.current >= calcSpeed(s.foodEaten, s.activePU)) {
          lastTickRef.current = ts;
          tick(s, cs);
        }
      }

      // render
      if (canvasRef.current) {
        const ctx2d = canvasRef.current.getContext('2d');
        render(ctx2d, s, skinId, ts, cs);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    function kill(s) {
      if (s.dead) return;
      s.dead = true;
      s.deathFlash = 12;
      if (soundRef.current) audio.die();
      if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
      const result = recordGameOver(s.score);
      setUi(u => ({ ...u, dead: true }));
      setTimeout(() => onDeadRef.current?.({ score: s.score, ...result }), 600);
    }

    function tick(s, cs) {
      s.dir = s.nextDir;
      let hx = s.snake[0].x + s.dir.x;
      let hy = s.snake[0].y + s.dir.y;

      const isShield = s.activePU?.type === PU.SHIELD;

      // wall check
      const outOfBounds = hx < 0 || hx >= GRID_W || hy < 0 || hy >= GRID_H;
      if (outOfBounds) {
        if (s.mode === MODES.INFINITE || isShield) {
          hx = ((hx % GRID_W) + GRID_W) % GRID_W;
          hy = ((hy % GRID_H) + GRID_H) % GRID_H;
        } else { kill(s); return; }
      }

      // self / obstacle collision
      const hitSelf = s.snake.some(seg => seg.x === hx && seg.y === hy);
      const hitObs = s.obstacles.some(o => o.x === hx && o.y === hy);
      if ((hitSelf || hitObs) && !isShield) { kill(s); return; }

      s.snake = [{ x: hx, y: hy }, ...s.snake];

      // food
      if (hx === s.food.x && hy === s.food.y) {
        const mult = s.activePU?.type === PU.X2 ? 2 : 1;
        s.score += 10 * mult;
        s.foodEaten++;
        if (soundRef.current) audio.eat();
        s.particles.push(...mkParticles(hx, hy, '#FF2244', cs));

        // level up
        const newLevel = Math.floor(s.score / PTS_PER_LEVEL) + 1;
        if (newLevel > s.level) {
          s.level = newLevel;
          s.obstacles = mkObstacles(s.level, s.snake, s.food);
          if (soundRef.current) audio.levelup();
        }

        s.food = rnd(s.snake, s.obstacles, s.powerUps, null);

        // spawn power-up
        if (Math.random() < 0.18 && s.powerUps.length < 2) {
          const types = Object.values(PU);
          const type = types[Math.floor(Math.random() * types.length)];
          s.powerUps.push({ ...rnd(s.snake, s.obstacles, s.powerUps, s.food), type, expiresAt: Date.now() + 12000 });
        }

        setUi(u => ({ ...u, score: s.score, level: s.level }));
      } else {
        s.snake.pop();
      }

      // collect power-up
      const puIdx = s.powerUps.findIndex(p => p.x === hx && p.y === hy);
      if (puIdx >= 0) {
        const pu = s.powerUps.splice(puIdx, 1)[0];
        s.activePU = { type: pu.type, startedAt: Date.now(), expiresAt: Date.now() + PU_DURATION[pu.type] };
        if (soundRef.current) audio.powerup();
        s.particles.push(...mkParticles(hx, hy, PU_COLOR[pu.type], cs, 14));
        setUi(u => ({ ...u, activePU: s.activePU }));
      }

      // expire field power-ups
      s.powerUps = s.powerUps.filter(p => Date.now() < p.expiresAt);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [mode, canvasRef, skinId, init, syncUi]);

  return { ...ui, setDir, togglePause, restart: init };
}
