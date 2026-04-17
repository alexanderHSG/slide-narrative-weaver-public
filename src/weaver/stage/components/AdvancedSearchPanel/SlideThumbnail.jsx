import { useRef, useEffect } from 'react';
import { drawSlideToCanvas } from '@/weaver/signals/lib/images/drawSlideToCanvas';

export default function SlideThumbnail({
  objectId,
  width = 120,
  height = 120,
  fit = 'cover',
  onClick,
  supersample = 2, 
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const wrap = wrapRef.current;
      const c = canvasRef.current;
      if (!wrap || !c) return;

      const cssW = wrap.clientWidth || width;
      const cssH = wrap.clientHeight || height;

      const dpr = Math.max(1, window.devicePixelRatio || 1);
      c.width = Math.round(cssW * dpr);
      c.height = Math.round(cssH * dpr);
      c.style.width = '100%';
      c.style.height = '100%';

      const ow = Math.round(cssW * dpr * supersample);
      const oh = Math.round(cssH * dpr * supersample);
      const off =
        typeof OffscreenCanvas !== 'undefined'
          ? new OffscreenCanvas(ow, oh)
          : Object.assign(document.createElement('canvas'), { width: ow, height: oh });

      try {
        await drawSlideToCanvas(objectId, off, fit);
      } catch {
        const vctx = c.getContext('2d');
        vctx?.clearRect(0, 0, c.width, c.height);
        return;
      }

      const vctx = c.getContext('2d');
      if (!vctx) return;
      vctx.clearRect(0, 0, c.width, c.height);
      vctx.imageSmoothingEnabled = true;
      vctx.imageSmoothingQuality = 'high';

      if ('transferToImageBitmap' in off) {

        const bmp = off.transferToImageBitmap();
        vctx.drawImage(bmp, 0, 0, c.width, c.height);
      } else {
        vctx.drawImage(off, 0, 0, c.width, c.height);
      }

      if (cancelled) return;
    })();

    return () => { cancelled = true; };
  }, [objectId, width, height, fit, supersample]);

  return (
    <div
      ref={wrapRef}
      style={{ width, height }}
      className="rounded-2xl overflow-hidden self-center
                 transition-transform duration-200 hover:scale-110 cursor-pointer will-change-transform"
      onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Slide Thumbnail"
        className="block w-full h-full"
        draggable={false}
      />
    </div>
  );
}
