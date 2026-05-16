import { useTranslation } from 'react-i18next';
import { PU_COLOR } from '../constants/game';

export default function HUD({ score, level, timeLeft, activePU, combo, hackActive, hackAvailAt, onPause }) {
  const { t } = useTranslation();

  const puLabel = activePU ? t(`game.pu.${activePU.type}`) : null;
  const puColor = activePU ? PU_COLOR[activePU.type] : null;

  const hackReady = Date.now() >= (hackAvailAt || 0);
  const hackLabel = hackActive ? t('game.hack') : hackReady ? t('game.hackReady') : '⬡ HACK';

  return (
    <div className="hud">
      <div className="hud-left">
        <span className="hud-label">{t('game.score')}</span>
        <span className="hud-value">{score}</span>
        {combo > 0 && (
          <span className="hud-combo">×{Math.min(combo + 1, 5)}</span>
        )}
      </div>

      <div className="hud-center">
        {activePU && (
          <div className="hud-pu" style={{ color: puColor, borderColor: puColor, boxShadow: `0 0 10px ${puColor}` }}>
            {puLabel}
          </div>
        )}
        {hackActive && (
          <div className="hud-pu hud-hack-active">
            {t('game.hack')}
          </div>
        )}
      </div>

      <div className="hud-right">
        <div
          className={`hud-hack-btn ${hackActive ? 'active' : hackReady ? 'ready' : 'cooldown'}`}
          title="H - Hack Mode"
        >
          {hackLabel}
        </div>

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
