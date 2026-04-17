import { useState, useEffect, useRef } from 'react';
import { ImageOff } from 'lucide-react';

const SkeletonLoader = ({ className = '' }) => (
  <div className={`w-full h-full bg-slate-200 animate-pulse ${className}`} />
);

export function ImageWithFallback({
  src,
  alt,
  className = '',
  loading = 'lazy',
  decoding = 'async',
  fetchPriority = 'auto',
  width,
  height,
}) {
  const [status, setStatus] = useState(src ? 'loading' : 'error');
  const displayRef = useRef(null);
  const probeRef = useRef(null);

  useEffect(() => {
    setStatus(src ? 'loading' : 'error');
  }, [src]);

  useEffect(() => {
    if (status !== 'loading') return;
    const el = probeRef.current;
    if (el && el.complete) {
      if (el.naturalWidth > 0) setStatus('loaded');
      else setStatus('error');
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'loaded') return;
    const img = displayRef.current;
    if (img && img.complete) {
      if (img.naturalWidth > 0) {
        img.classList.add('opacity-100');
      }
    }
  }, [status]);

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 text-slate-400 ${className}`}
        role="img"
        aria-label={alt || 'Image failed to load'}
      >
        <ImageOff />
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="relative w-full h-full">
        <SkeletonLoader />
        <img
          ref={probeRef}
          src={src}
          alt={alt || ''}
          onError={() => setStatus('error')}
          onLoad={() => setStatus('loaded')}
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none select-none"
          decoding="async"
          fetchPriority={fetchPriority}
          width={width}
          height={height}
          draggable={false}
        />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 text-slate-400 ${className}`}
        role="img"
        aria-label={alt || 'Image failed to load'}
      >
        <ImageOff />
      </div>
    );
  }

  return (
    <img
      ref={displayRef}
      src={src}
      alt={alt || ''}
      className={`${className} transition-opacity duration-300 opacity-0`}
      onLoad={(e) => e.currentTarget.classList.add('opacity-100')}
      onError={() => setStatus('error')}
      loading={loading}       
      decoding={decoding}
      fetchPriority={fetchPriority}
      width={width}
      height={height}
      draggable={false}
      style={{ imageRendering: 'auto' }}
    />
  );
}
