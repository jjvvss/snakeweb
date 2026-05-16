import { DIR } from '../constants/game';

export default function MobileControls({ onDir }) {
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
    <div className="dpad">
      <div className="dpad-row">{btn(DIR.UP, '▲')}</div>
      <div className="dpad-row">
        {btn(DIR.LEFT, '◀')}
        <span className="dpad-center" />
        {btn(DIR.RIGHT, '▶')}
      </div>
      <div className="dpad-row">{btn(DIR.DOWN, '▼')}</div>
    </div>
  );
}
