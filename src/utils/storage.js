const KEY = 'neon-snake';

const defaults = {
  bestScore: 0,
  totalScore: 0,
  selectedSkin: 'classic',
  soundOn: true,
  vibrationOn: true,
  streak: 0,
  lastPlayedDate: null,
  colorTheme: 'green',
  language: null,
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

export function recordGameOver(score) {
  const d = loadData();
  const best = Math.max(d.bestScore, score);
  const total = d.totalScore + score;
  updateStreak();
  saveData({ bestScore: best, totalScore: total });
  return { isNewRecord: score > d.bestScore, bestScore: best };
}
