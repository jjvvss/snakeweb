import { useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DIR } from '../constants/game';
import { loadData } from '../utils/storage';
import { useGameEngine } from '../hooks/useGameEngine';
import { useSwipe } from '../hooks/useSwipe';
import HUD from '../components/HUD';
import MobileControls from '../components/MobileControls';

const KEY_DIR = {
  ArrowUp: DIR.UP, w: DIR.UP, W: DIR.UP,
  ArrowDown: DIR.DOWN, s: DIR.DOWN, S: DIR.DOWN,
  ArrowLeft: DIR.LEFT, a: DIR.LEFT, A: DIR.LEFT,
  ArrowRight: DIR.RIGHT, d: DIR.RIGHT, D: DIR.RIGHT,
};

export default function GameScreen() {
  const { mode } = useParams();
  const nav = useNavigate();
  const canvasRef = useRef(null);
  const data = loadData();

  const onDead = useCallback(({ score, isNewRecord, bestScore }) => {
    nav('/gameover', { state: { score, isNewRecord, bestScore, mode } });
  }, [nav, mode]);

  const { score, level, timeLeft, activePU, paused, setDir, togglePause, restart } =
    useGameEngine({ mode, canvasRef, skinId: data.selectedSkin, soundOn: data.soundOn, onDead });

  // keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { togglePause(); return; }
      const dir = KEY_DIR[e.key];
      if (dir) { e.preventDefault(); setDir(dir); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setDir, togglePause]);

  // swipe
  useSwipe((direction) => {
    const map = { up: DIR.UP, down: DIR.DOWN, left: DIR.LEFT, right: DIR.RIGHT };
    setDir(map[direction]);
  });

  const isMobile = 'ontouchstart' in window;

  return (
    <div className="screen game-screen">
      <HUD score={score} level={level} timeLeft={timeLeft} activePU={activePU} onPause={togglePause} />

      <div className="canvas-wrap">
        <canvas ref={canvasRef} className="game-canvas" />
        {paused && (
          <div className="pause-overlay">
            <button className="resume-btn" onClick={togglePause}>▶ Resume</button>
            <button className="menu-btn" onClick={() => nav('/')}>⌂ Menu</button>
          </div>
        )}
      </div>

      {isMobile && <MobileControls onDir={setDir} />}
    </div>
  );
}
