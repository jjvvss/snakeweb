import { useEffect, useRef } from 'react';

export function useSwipe(onSwipe) {
  const start = useRef(null);
  const onSwipeRef = useRef(onSwipe);
  useEffect(() => { onSwipeRef.current = onSwipe; }, [onSwipe]);

  useEffect(() => {
    const onStart = (e) => {
      const t = e.touches?.[0] || e;
      start.current = { x: t.clientX, y: t.clientY };
    };

    const onEnd = (e) => {
      if (!start.current) return;
      const t = e.changedTouches?.[0] || e;
      const dx = t.clientX - start.current.x;
      const dy = t.clientY - start.current.y;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      if (Math.max(adx, ady) < 20) return;
      if (adx > ady) onSwipeRef.current(dx > 0 ? 'right' : 'left');
      else onSwipeRef.current(dy > 0 ? 'down' : 'up');
      start.current = null;
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, []);
}
