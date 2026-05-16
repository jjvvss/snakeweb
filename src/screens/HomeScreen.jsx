import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MODES } from '../constants/game';
import { loadData, getLeaderboard } from '../utils/storage';
import { music } from '../utils/music';

export default function HomeScreen() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [mode, setMode] = useState(MODES.CLASSIC);
  const data = loadData();
  const topHackers = getLeaderboard().slice(0, 3);

  useEffect(() => {
    music.setVolume(data.musicVolume / 100);
    music.start();
  }, []);

  const modes = [MODES.CLASSIC, MODES.TIME_ATTACK, MODES.INFINITE];

  return (
    <div className="screen home-screen">
      <h1 className="game-title">{t('appTitle')}</h1>

      <div className="best-score-box">
        <span className="best-label">{t('home.bestScore')}</span>
        <span className="best-value">{data.bestScore}</span>
      </div>

      {data.streak > 1 && (
        <div className="streak-badge">🔥 {t('home.streak', { count: data.streak })}</div>
      )}

      <div className="mode-selector">
        {modes.map(m => (
          <button
            key={m}
            className={`mode-btn ${mode === m ? 'active' : ''}`}
            onClick={() => setMode(m)}
          >
            {t(`home.modes.${m}`)}
          </button>
        ))}
      </div>

      <p className="mode-desc">{t(`home.modeDesc.${mode}`)}</p>

      <button className="play-btn" onClick={() => nav(`/game/${mode}`)}>
        {t('home.play')}
      </button>

      <button className="settings-link" onClick={() => nav('/settings')}>
        ⚙ {t('home.settings')}
      </button>

      {topHackers.length > 0 && (
        <div className="home-leaderboard">
          <div className="home-lb-title">{t('home.leaderboard')}</div>
          {topHackers.map((entry, i) => (
            <div key={i} className="home-lb-row">
              <span className="home-lb-rank">{['①','②','③'][i]}</span>
              <span className="home-lb-name">{entry.name}</span>
              <span className="home-lb-score">{entry.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
