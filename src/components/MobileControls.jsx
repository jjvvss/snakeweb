import { DIR } from '../constants/game';

export default function MobileControls({ onDir, onDash, onHack, dashAvailAt, hackAvailAt, hackActive }) {
  const now = Date.now();
  const dashReady = now >= (dashAvailAt || 0);
  const hackReady = now >= (hackAvailAt || 0);

  const btn = (dir, label) => (
    <button
      className="dpad-btn"
      onPointerDown={(e) => { e.preventDefault(); onDir(dir); }}
      aria-label={label}
    >
      {label}
    </button>
  );

  return (
    <div className="mobile-controls">
      <div className="dpad">
        <div className="dpad-row">{btn(DIR.UP, '▲')}</div>
        <div className="dpad-row">
          {btn(DIR.LEFT, '◀')}
          <span className="dpad-center" />
          {btn(DIR.RIGHT, '▶')}
        </div>
        <div className="dpad-row">{btn(DIR.DOWN, '▼')}</div>
      </div>

      <div className="action-btns">
        <button
          className={`action-btn dash-btn ${dashReady ? 'ready' : 'cooldown'}`}
          onPointerDown={(e) => { e.preventDefault(); onDash(); }}
          aria-label="Dash"
        >
          ⚡<span className="action-label">DASH</span>
        </button>
        <button
          className={`action-btn hack-btn ${hackActive ? 'active' : hackReady ? 'ready' : 'cooldown'}`}
          onPointerDown={(e) => { e.preventDefault(); onHack(); }}
          aria-label="Hack"
        >
          ⬡<span className="action-label">HACK</span>
        </button>
      </div>
    </div>
  );
}
