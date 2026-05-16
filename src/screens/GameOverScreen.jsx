import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function GameOverScreen() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { state } = useLocation();
  const { score = 0, isNewRecord = false, bestScore = 0, mode } = state || {};

  return (
    <div className="screen over-screen">
      <h1 className="over-title">{t('over.title')}</h1>

      {isNewRecord && <div className="new-record">{t('over.newRecord')}</div>}

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
