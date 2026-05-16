import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getLeaderboard } from '../utils/storage';

export default function GameOverScreen() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { state } = useLocation();
  const { score = 0, isNewRecord = false, bestScore = 0, hackerName = '', mode } = state || {};
  const leaderboard = getLeaderboard();

  return (
    <div className="screen over-screen">
      <h1 className="over-title">{t('over.title')}</h1>

      {isNewRecord && <div className="new-record">{t('over.newRecord')}</div>}

      {hackerName && (
        <div className="hacker-name">{t('over.hacker', { name: hackerName })}</div>
      )}

      <div className="score-block">
        <div className="score-row">
          <span className="score-label">{t('over.score')}</span>
          <span className="score-num">{score}</span>
        </div>
        <div className="score-row">
          <span className="score-label">{t('over.best')}</span>
          <span className="score-num best">{bestScore}</span>
        </div>
      </div>

      {leaderboard.length > 0 && (
        <div className="leaderboard">
          <div className="lb-title">{t('over.leaderboard')}</div>
          {leaderboard.slice(0, 8).map((entry, i) => (
            <div key={i} className={`lb-row ${entry.name === hackerName && entry.score === score ? 'lb-you' : ''}`}>
              <span className="lb-rank">#{i + 1}</span>
              <span className="lb-name">{entry.name}</span>
              <span className="lb-score">{entry.score}</span>
            </div>
          ))}
        </div>
      )}

      <div className="over-actions">
        <button className="play-btn" onClick={() => nav(`/game/${mode || 'classic'}`)}>
          {t('over.retry')}
        </button>
        <button className="secondary-btn" onClick={() => nav('/')}>
          {t('over.home')}
        </button>
      </div>
    </div>
  );
}
