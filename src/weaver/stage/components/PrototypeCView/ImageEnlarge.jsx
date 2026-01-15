import { useEffect, useRef } from 'react';
import { drawSlideToCanvas } from '@/weaver/signals/lib/images/drawSlideToCanvas';
import { X } from 'lucide-react';

export default function ImageEnlarge({ objectId, isOpen, onClose, width = 1600, height = 1000 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen || !objectId) return;
    (async () => {
      const c = ref.current;
      if (!c) return;
      const ctx = c.getContext('2d', { alpha: false });
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, c.width, c.height);
      try {
        await drawSlideToCanvas(objectId, c, 'contain');
      } catch {
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px system-ui';
        ctx.fillText('Preview unavailable', 20, 40);
      }
    })();
  }, [isOpen, objectId]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center"
      onClick={onClose}
      onContextMenu={(e)=>e.preventDefault()}
      role="dialog"
      aria-modal="true"
    >
      <canvas
        ref={ref}
        width={width}
        height={height}
        className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white text-2xl font-bold"
        aria-label="Close preview"
        title="Close"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
