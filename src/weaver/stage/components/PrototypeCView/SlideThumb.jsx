import { useEffect, useRef } from 'react';
import { ZoomInIcon } from 'lucide-react';
import { drawSlideToCanvas } from '@/weaver/signals/lib/images/drawSlideToCanvas';

export default function SlideThumb({
  slide,
  onClick,
  loading = 'lazy',
  decoding = 'async',
  fetchPriority = 'auto',
  width,
  height,
  className = '',
}) {
  const canvasRef = useRef(null);

  const objectId = slide?.object_id || null;
  const title = (slide?.title || 'Slide').trim();
  const isClickable = !!objectId;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const c = canvasRef.current;
      if (!c) return;

      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const rect = c.getBoundingClientRect();
      c.width = Math.max(1, Math.round(rect.width * dpr));
      c.height = Math.max(1, Math.round(rect.height * dpr));

      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, c.width, c.height);

      if (!objectId) {
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = '#94a3b8';
        ctx.font = `${14 * dpr}px system-ui`;
        ctx.fillText('No preview', 16 * dpr, 28 * dpr);
        return;
      }

      try {
        await drawSlideToCanvas(objectId, c, 'cover');
      } catch {
        if (cancelled) return;
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = '#ef4444';
        ctx.font = `${14 * dpr}px system-ui`;
        ctx.fillText('Preview unavailable', 16 * dpr, 28 * dpr);
      }
    })();

    return () => { cancelled = true; };
  }, [objectId]);

  const clickableProps = isClickable
    ? {
        onClick: () => onClick?.(objectId),
        onKeyDown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') onClick?.(objectId);
        },
        role: 'button',
        tabIndex: 0,
        title: `Zoom: ${title}`,
      }
    : { title };

  return (
    <div
      className={`
        group/thumb h-full flex flex-col rounded-xl overflow-hidden bg-white border border-slate-200
        transition-all duration-300 ease-in-out
        ${isClickable
          ? 'shadow-md hover:shadow-xl hover:border-green-600 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500'
          : 'shadow-sm'}
      `}
      {...clickableProps}
    >
      <div
        className={`
          relative aspect-video bg-slate-50 overflow-hidden
          ${isClickable ? 'cursor-pointer' : 'cursor-default'}
        `}
      >
        <canvas
          ref={canvasRef}
          className={`w-full h-full block ${className}`}
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
          aria-label={`Thumbnail for ${title}`}
          role="img"
        />

        {isClickable && (
          <div className="pointer-events-none absolute inset-0 bg-black bg-opacity-0 group-hover/thumb:bg-opacity-40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-all duration-300">
            <ZoomInIcon className="w-6 h-6 text-white" />
          </div>
        )}
      </div>

      <div className="p-3 flex-grow flex items-center">
        <p className="text-sm text-center w-full font-medium text-slate-800 leading-snug line-clamp-1">
          {title}
        </p>
      </div>
    </div>
  );
}
