import { useTranslation } from 'react-i18next';
import { PU_COLOR } from '../constants/game';

export default function HUD({ score, level, timeLeft, activePU, onPause }) {
  const { t } = useTranslation();

  const puLabel = activePU ? t(`game.pu.${activePU.type}`) : null;
  const puColor = activePU ? PU_COLOR[activePU.type] : null;

  return (
    <div className="hud">
      <div className="hud-left">
        <span className="hud-label">{t('game.score')}</span>
        <span className="hud-value">{score}</span>
      </div>

      {activePU && (
        <div className="hud-pu" style={{ color: puColor, borderColor: puColor, boxShadow: `0 0 10px ${puColor}` }}>
          {puLabel}
        </div>
      )}

      <div className="hud-right">
        {timeLeft !== null ? (
          <>
            <span className="hud-label">{t('game.time')}</span>
            <span className="hud-value" style={{ color: timeLeft < 10 ? '#FF4444' : undefined }}>
              {Math.ceil(timeLeft)}s
            </span>
          </>
        ) : (
          <>
            <span className="hud-label">{t('game.level')}</span>
            <span className="hud-value">{level}</span>
          </>
        )}
        <button className="hud-pause-btn" onClick={onPause} aria-label="Pause">⏸</button>
      </div>
    </div>
  );
}
