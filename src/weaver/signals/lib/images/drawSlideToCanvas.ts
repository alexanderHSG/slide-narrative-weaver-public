import { supabase } from '../auth/supabaseClient';

type Fit = 'contain' | 'cover';

type DrawOpts = {
  fmt?: 'orig' | 'jpeg' | 'png' | 'webp' | 'avif';
  q?: number;
  serverResize?: boolean;
  baseUrl?: string;
  dpr?: number; 
};

function computeRectFit(
  srcW: number, srcH: number,
  dstW: number, dstH: number,
  mode: Fit
) {
  if (mode === 'contain') {
    const s = Math.min(dstW / srcW, dstH / srcH);
    const dw = Math.round(srcW * s);
    const dh = Math.round(srcH * s);
    const dx = Math.floor((dstW - dw) / 2);
    const dy = Math.floor((dstH - dh) / 2);
    return { sx: 0, sy: 0, sw: srcW, sh: srcH, dx, dy, dw, dh };
  }

  const srcAR = srcW / srcH;
  const dstAR = dstW / dstH;

  if (srcAR > dstAR) {
    const sh = srcH;
    const sw = Math.round(sh * dstAR);
    const sx = Math.floor((srcW - sw) / 2);
    const sy = 0;
    return { sx, sy, sw, sh, dx: 0, dy: 0, dw: dstW, dh: dstH };
  } else {
    const sw = srcW;
    const sh = Math.round(sw / dstAR);
    const sx = 0;
    const sy = Math.floor((srcH - sh) / 2);
    return { sx, sy, sw, sh, dx: 0, dy: 0, dw: dstW, dh: dstH };
  }
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

export async function drawSlideToCanvas(
  objectId: string,
  canvas: HTMLCanvasElement,
  fit: Fit = 'contain',
  opts: DrawOpts = {}
) {
  if (!objectId || !canvas) return;

  const {
    fmt = 'png',
    q = 200,
    serverResize = true,
    baseUrl = '/.netlify/functions/slide',
    dpr = Math.max(1, (window as any).devicePixelRatio || 1),
  } = opts;

  const rect = canvas.getBoundingClientRect();
  const dstW = Math.max(1, Math.round(rect.width * dpr));
  const dstH = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== dstW || canvas.height !== dstH) {
    canvas.width = dstW;
    canvas.height = dstH;
  }

  const headers: Record<string, string> = {};
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {}

  const url = new URL(baseUrl, window.location.origin);
  url.searchParams.set('objectId', objectId);
  url.searchParams.set('fmt', fmt);
  url.searchParams.set('q', String(Math.max(1, Math.min(100, q))));
  if (serverResize) {
    url.searchParams.set('w', String(dstW));
    url.searchParams.set('h', String(dstH));
    url.searchParams.set('fit', fit);
  }

  const res = await fetch(url.toString(), { headers, credentials: 'same-origin', cache: 'no-store' });
  if (!res.ok) throw new Error(`slide fetch failed: ${res.status}`);

  const blob = await res.blob();

  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) return;
  ctx.clearRect(0, 0, dstW, dstH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if ('createImageBitmap' in window) {
    const bitmap = await (createImageBitmap as any)(blob, { resizeQuality: 'high' });
    try {
      const { sx, sy, sw, sh, dx, dy, dw, dh } = computeRectFit(
        bitmap.width, bitmap.height, dstW, dstH, fit
      );
      ctx.drawImage(bitmap, sx, sy, sw, sh, dx, dy, dw, dh);
    } finally {
      (bitmap as any).close?.();
    }
    return;
  }

  const img = await blobToImage(blob);
  const { sx, sy, sw, sh, dx, dy, dw, dh } = computeRectFit(
    img.naturalWidth, img.naturalHeight, dstW, dstH, fit
  );

  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}
