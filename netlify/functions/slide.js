import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import * as opentype from 'opentype.js';
import { getExperimentalIdentityFromCookie } from '../_shared/expSession.js';
import { jwtVerify, decodeJwt } from 'jose';

const S3_BASE = process.env.S3_BASE;
const EXTS    = (process.env.S3_EXTS || "png")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const DEFAULTS = {
  angle: -30,
  opacity: 0.14,
  fontSize: 25,
  padX: 50,
  padY: 200,
  strokeWidth: 1,
  strokeOpacity: 0.28,
};

const FONT_FILE = process.env.WM_TTF_NAME || 'NotoSans-Regular.ttf';
const JWT_SIGNING_KEY = (process.env.JWT_SIGNING_KEY || '').trim();
const AUDIENCE = 'inspira.auth';

function bufToArrayBuffer(buf) {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function tryReadAB(p) {
  try {
    const buf = fs.readFileSync(p);
    return bufToArrayBuffer(buf);
  } catch {
    return null;
  }
}

const FONT_CANDIDATES = [
  () => {
    const b64 = process.env.WM_TTF_BASE64;
    if (b64 && b64.length > 100) {
      const buf = Buffer.from(b64, 'base64');
      return bufToArrayBuffer(buf);
    }
    return null;
  },
  () => tryReadAB(path.join(process.cwd(), 'netlify', '_shared', 'fonts',     FONT_FILE)),
  () => tryReadAB(path.join(process.cwd(), 'netlify', '_shared',              FONT_FILE)),
  () => tryReadAB(path.join(process.cwd(),                                       FONT_FILE)),
];

let FONT_OBJ = null;
function loadFontOrNull() {
  if (FONT_OBJ) return FONT_OBJ;
  for (const get of FONT_CANDIDATES) {
    const ab = get();
    if (ab && ab.byteLength) {
      try {
        FONT_OBJ = opentype.parse(ab);
        console.log(`[watermark] font parsed OK bytes=${ab.byteLength}`);
        return FONT_OBJ;
      } catch (e) {
        console.warn('[watermark] font parse failed:', e?.message);
      }
    }
  }
  console.warn('[watermark] no usable font found; using vector fallback banner');
  return null;
}

function ascii(s = '') {
  return String(s)
    .normalize('NFKD')
    .replaceAll('—', '-')
    .replaceAll('–', '-')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x20-\x7E]/g, '?') || '?';
}

function buildSimpleFallbackSVG({ width, height, angle, opacity, fontSize = 22 }) {
  const stepY = Math.max(fontSize * 5, 120);
  const stepX = 320;
  const rows = Math.ceil((height * 3) / stepY);
  const cols = Math.ceil((width * 3) / stepX);
  let texts = '';
  for (let r = 0; r < rows; r++) {
    const y = -height + r * stepY;
    const xOff = (r % 2) ? stepX / 2 : 0;
    for (let c = 0; c < cols; c++) {
      const x = -width - stepX + c * stepX + xOff;
      texts += `<text x="${x}" y="${y}">COPY • COPY • COPY • COPY</text>`;
    }
  }
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <g transform="translate(${width/2} ${height/2}) rotate(${angle}) translate(${-width/2} ${-height/2})"
       font-family="monospace" font-size="${fontSize}"
       fill="#000" fill-opacity="${opacity}"
       stroke="#fff" stroke-opacity="0.25" stroke-width="1" paint-order="stroke fill"
       text-rendering="geometricPrecision">
      ${texts}
    </g>
  </svg>`;
  return Buffer.from(svg, 'utf8');
}

function buildWatermarkSVGBuffer({
  width, height, text,
  angle = DEFAULTS.angle,
  opacity = DEFAULTS.opacity,
  fontSize = DEFAULTS.fontSize,
  padX = DEFAULTS.padX,
  padY = DEFAULTS.padY,
  strokeWidth = DEFAULTS.strokeWidth,
  strokeOpacity = DEFAULTS.strokeOpacity,
}) {
  const font = loadFontOrNull();

  if (!font) return buildSimpleFallbackSVG({ width, height, angle, opacity });

  const safeText = ascii(text);
  const advW = Math.max(
    200,
    Math.round(font.getAdvanceWidth(safeText, fontSize, { kerning: true }))
  );
  const stepX = advW + padX;
  const stepY = Math.max(fontSize * 3, padY);
  const baseline = fontSize;

  const paths = [];
  let row = 0;
  for (let y = -height; y < height * 2; y += stepY, row++) {
    const xOffset = (row % 2 === 0) ? 0 : stepX / 2;
    for (let x = -width - stepX; x < width * 2; x += stepX) {
      const p = font.getPath(safeText, x + xOffset, y + baseline, fontSize, { kerning: true });
      paths.push(`<path d="${p.toPathData(2)}"/>`);
    }
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <g transform="translate(${width/2} ${height/2}) rotate(${angle}) translate(${-width/2} ${-height/2})">
        <g fill="#000" fill-opacity="${opacity}"
           stroke="#fff" stroke-opacity="${strokeOpacity}" stroke-width="${strokeWidth}"
           shape-rendering="geometricPrecision" paint-order="stroke fill">
          ${paths.join('\n')}
        </g>
      </g>
    </svg>
  `;
  return Buffer.from(svg, 'utf8');
}

function isSafeId(id) {
  return typeof id === "string" && /^[A-Za-z0-9._-]+$/.test(id);
}

function formatUtc(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return String(iso || '');
  const y  = d.getUTCFullYear();
  const m  = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day= String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm} UTC`;
}

function getExpCookieToken(event) {
  const raw = event.headers?.cookie || event.headers?.Cookie || '';
  const m = raw && raw.match(/(?:^|;\s*)exp_session=([^;]+)/);
  return m?.[1] || null;
}

async function isExperimentalTtlExpired(event) {
  const token = getExpCookieToken(event);
  if (!token) return false;

  if (JWT_SIGNING_KEY) {
    try {
      const key = new TextEncoder().encode(JWT_SIGNING_KEY);
      await jwtVerify(token, key, { algorithms: ['HS256'], audience: AUDIENCE });
      return false;
    } catch (e) {
      const msg = e?.message || '';
      const expired = e?.code === 'ERR_JWT_EXPIRED' || /expir/i.test(msg);
      return !!expired;
    }
  }

  try {
    const payload = decodeJwt(token);
    const expMs = payload?.exp ? payload.exp * 1000 : null;
    if (expMs == null) return false;
    return Date.now() >= expMs;
  } catch {
    return false;
  }
}

export async function handler(event) {
  if (!S3_BASE) {
    return { statusCode: 500, body: "Missing S3_BASE env" };
  }

  const objectId = event.queryStringParameters?.objectId;
  if (!isSafeId(objectId)) {
    return { statusCode: 400, body: "Invalid objectId" };
  }

  try {
    const expired = await isExperimentalTtlExpired(event);
    if (expired) {
      return {
        statusCode: 401,
        headers: { "Cache-Control": "no-store" },
        body: "experimental-session-expired"
      };
    }
  } catch { }

  let exp = null;
  try { exp = await getExperimentalIdentityFromCookie(event); } catch { exp = null; }

  for (const ext of EXTS) {
    const url = `${S3_BASE}/${encodeURIComponent(objectId)}.${ext}`;
    try {
      const r = await fetch(url);
      if (!r.ok) {
        if (r.status === 404) continue;
        return { statusCode: 502, body: `Upstream error ${r.status}` };
      }

      const ct  = r.headers.get("content-type") || (ext === "png" ? "image/png" : "application/octet-stream");
      const buf = Buffer.from(await r.arrayBuffer());

      if (!exp) {
        return {
          statusCode: 200,
          headers: {
            "Content-Type": ct,
            "Cache-Control": "no-store",
            "Referrer-Policy": "same-origin",
          },
          body: buf.toString("base64"),
          isBase64Encoded: true,
        };
      }

      const text = `${exp.pid} | ${formatUtc(exp.ts)} - Traceable copy. Sharing prohibited.`;

      let meta = {};
      try { meta = await sharp(buf).metadata(); } catch { meta = {}; }
      const targetW = meta.width  || 1280;
      const targetH = meta.height || 720;

      const overlay = buildWatermarkSVGBuffer({
        width: targetW,
        height: targetH,
        text,
      });

      const outFmt =
        (meta.format && String(meta.format).toLowerCase()) ||
        (ct.includes('jpeg') || ct.includes('jpg') ? 'jpeg' : 'png');

      const outBuf = await sharp(buf)
        .composite([{ input: overlay, gravity: 'center' }])
        .toFormat(outFmt, outFmt === 'jpeg' ? { quality: 85 } : {})
        .toBuffer();

      const outCt =
        outFmt === 'jpeg' ? 'image/jpeg' :
        outFmt === 'png'  ? 'image/png'  :
        ct;

      const fontPresent = !!FONT_OBJ;
      return {
        statusCode: 200,
        headers: {
          "Content-Type": outCt,
          "Cache-Control": "no-store",
          "Referrer-Policy": "same-origin",
          "X-Watermark-Mode": fontPresent ? "vector-font" : "fallback",
        },
        body: outBuf.toString("base64"),
        isBase64Encoded: true,
      };
    } catch {
      continue;
    }
  }

  return { statusCode: 404, body: "Not found" };
}
