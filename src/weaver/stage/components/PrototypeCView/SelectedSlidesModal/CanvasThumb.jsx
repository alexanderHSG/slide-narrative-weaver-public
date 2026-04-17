import { useEffect, useRef } from 'react';
import { drawSlideToCanvas } from '@/weaver/signals/lib/images/drawSlideToCanvas';

export default function CanvasThumb({ objectId, alt = 'Selected slide' }) {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const resize = () => {
      const rect = c.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (w !== c.width || h !== c.height) {
        c.width = w; c.height = h;
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    (async () => {
      try {
        await drawSlideToCanvas(objectId, c, 'cover');
      } catch {
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = '#475569';
        ctx.font = `${12 * dpr}px system-ui`;
        ctx.fillText('Preview unavailable', 12 * dpr, 22 * dpr);
      }
    })();

    return () => { try { ro.disconnect(); } catch {} };
  }, [objectId]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={alt}
      className="w-full aspect-video block"
      onContextMenu={(e) => e.preventDefault()}
      draggable={false}
    />
  );
}
