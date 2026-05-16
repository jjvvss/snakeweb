const KEY = 'neon-snake';

const HACKER_NAMES = [
  'n30n_h4ck3r', 'cyb3r_snak3', 'gl1tch_m0de', 'h4x0r_pr1m3',
  'r00t_acc3ss', 'null_ptr', 'xXx_snak3_xXx', 'v01d_ptr',
  'c0d3_br34k3r', 'inf1nit3_l00p', 'syst3m_f41l', 'k3rn3l_pan1c',
  'd4t4_3at3r', 'v1rus_l0rd', 'gl1tch_k1ng', 'ov3rcl0ck3d',
  'b1t_fl1pp3r', 'st4ck_0v3rfl0w', 'h3x_d3vil', 'c0r3_dump',
];

const defaults = {
  bestScore: 0,
  totalScore: 0,
  selectedSkin: 'classic',
  sfxVolume: 80,
  musicVolume: 70,
  vibrationOn: true,
  streak: 0,
  lastPlayedDate: null,
  colorTheme: 'green',
  language: null,
  wallsOn: true,
  leaderboard: [],
};

export function loadData() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

export function saveData(patch) {
  try {
    const current = loadData();
    localStorage.setItem(KEY, JSON.stringify({ ...current, ...patch }));
  } catch {}
}

export function updateStreak() {
  const d = loadData();
  const today = new Date().toDateString();
  const last = d.lastPlayedDate;
  let streak = d.streak;

  if (!last) {
    streak = 1;
  } else if (last === today) {
    // same day, no change
  } else {
    const diff = (new Date(today) - new Date(last)) / 86400000;
    streak = diff === 1 ? streak + 1 : 1;
  }
  saveData({ streak, lastPlayedDate: today });
  return streak;
}

export function addLeaderboardEntry(score) {
  const d = loadData();
  const name = HACKER_NAMES[Math.floor(Math.random() * HACKER_NAMES.length)];
  const entry = { name, score, date: new Date().toISOString() };
  const leaderboard = [...(d.leaderboard || []), entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  saveData({ leaderboard });
  return name;
}

export function getLeaderboard() {
  return loadData().leaderboard || [];
}

export function recordGameOver(score) {
  const d = loadData();
  const best = Math.max(d.bestScore, score);
  const total = d.totalScore + score;
  updateStreak();
  const hackerName = addLeaderboardEntry(score);
  saveData({ bestScore: best, totalScore: total });
  return { isNewRecord: score > d.bestScore, bestScore: best, hackerName };
}
