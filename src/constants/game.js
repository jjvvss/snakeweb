export const GRID_W = 20;
export const GRID_H = 20;
export const BASE_SPEED = 160;
export const MIN_SPEED = 55;
export const FOODS_PER_SPEED_UP = 5;
export const PTS_PER_LEVEL = 10;
export const TIME_ATTACK_SEC = 60;

export const DIR = {
  UP:    { x: 0,  y: -1 },
  DOWN:  { x: 0,  y:  1 },
  LEFT:  { x: -1, y:  0 },
  RIGHT: { x: 1,  y:  0 },
};

export const MODES = { CLASSIC: 'classic', TIME_ATTACK: 'time_attack', INFINITE: 'infinite' };

export const PU = { TURBO: 'turbo', SHIELD: 'shield', X2: 'x2' };

export const PU_DURATION = { turbo: 5000, shield: 3000, x2: 10000 };

export const PU_COLOR = { turbo: '#FFD700', shield: '#00FFFF', x2: '#FF00FF' };

export const SKINS = [
  { id: 'classic', name: 'Classic Green', head: '#00FF41', body: '#00CC33', glow: '#00FF41', pts: 0 },
  { id: 'cyber',   name: 'Cyber Blue',    head: '#00D4FF', body: '#0099CC', glow: '#00D4FF', pts: 50 },
  { id: 'plasma',  name: 'Plasma Purple', head: '#CC44FF', body: '#9900CC', glow: '#CC44FF', pts: 100 },
  { id: 'lava',    name: 'Lava Orange',   head: '#FF6600', body: '#CC4400', glow: '#FF6600', pts: 200 },
  { id: 'ice',     name: 'Ice White',     head: '#FFFFFF', body: '#AADDFF', glow: '#80FFFF', pts: 500 },
];
