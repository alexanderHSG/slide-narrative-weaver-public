import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const BASE_DIR = (typeof __dirname !== 'undefined') ? __dirname : process.cwd();
const FONT_FILE = 'NotoSans-Regular.woff2';

const FONT_CANDIDATES = [
  path.join(BASE_DIR, 'fonts', FONT_FILE),
  path.join(BASE_DIR, 'netlify', '_shared', 'fonts', FONT_FILE),
  path.join(process.cwd(), 'netlify', '_shared', 'fonts', FONT_FILE),
];

const DEFAULTS = {
  angle: -30,
  opacity: 0.12,
  fontSize: 28,
  padX: 250,
  padY: 200,
  charWidth: 0.55,
};

const FONT_MIME   = 'font/woff2';
const FONT_FORMAT = 'woff2';

let CACHED_FONT_BASE64 = null;
let LAST_FONT_PATH = null;

function resolveFontPath() {
  for (const p of FONT_CANDIDATES) if (existsSync(p)) return p;
  return null;
}

function loadFontBase64() {
  if (CACHED_FONT_BASE64) return CACHED_FONT_BASE64;

  if (process.env.WM_FONT_BASE64 && process.env.WM_FONT_BASE64.length > 100) {
    CACHED_FONT_BASE64 = process.env.WM_FONT_BASE64;
    LAST_FONT_PATH = 'ENV:WM_FONT_BASE64';
    return CACHED_FONT_BASE64;
  }

  const fontPath = resolveFontPath();
  if (fontPath) {
    try {
      const buf = readFileSync(fontPath);
      CACHED_FONT_BASE64 = buf.toString('base64');
      LAST_FONT_PATH = fontPath;
      return CACHED_FONT_BASE64;
    } catch (e) {
      console.warn('[watermark] Read font failed:', fontPath, e?.message);
    }
  } else {
    console.warn('[watermark] Font file not found in candidates:', FONT_CANDIDATES);
  }

  CACHED_FONT_BASE64 = '';
  LAST_FONT_PATH = '(missing)';
  return CACHED_FONT_BASE64;
}

function esc(s = '') {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function asciiFallback(s = '') {
  return s
    .replaceAll('—', '-')
    .replaceAll('–', '-')
    .replaceAll(' ', ' ')
    .replaceAll(/[^\x20-\x7E]/g, '?');
}

export function svgOverlay({
  width,
  height,
  text,
  angle = DEFAULTS.angle,
  opacity = DEFAULTS.opacity,
  fontSize = DEFAULTS.fontSize,
  padX = DEFAULTS.padX,
  padY = DEFAULTS.padY,
  charWidth = DEFAULTS.charWidth,
}) {
  const fontB64 = loadFontBase64();
  const hasFont = fontB64 && fontB64.length > 100;

  if (!svgOverlay._loggedOnce) {
    console.log(`[watermark] embeddedFont=${hasFont} source=${LAST_FONT_PATH} len=${fontB64?.length || 0}`);
    svgOverlay._loggedOnce = true;
  }

  const safeText = esc(hasFont ? (text ?? '') : asciiFallback(text ?? ''));

  const cssFontFace = hasFont
    ? `
      @font-face {
        font-family: 'WMFont';
        src: url(data:${FONT_MIME};base64,${fontB64}) format('${FONT_FORMAT}');
        font-weight: normal;
        font-style: normal;
        font-display: swap;
      }
    `
    : '';

  const fontFamily = hasFont ? `'WMFont', sans-serif` : 'sans-serif';

  const textW = Math.max(200, Math.round(fontSize * charWidth * safeText.length));
  const stepX = textW + padX;
  const stepY = Math.max(fontSize * 3, padY);

  const nodes = [];
  let row = 0;
  for (let y = -height; y < height * 2; y += stepY, row++) {
    const xOffset = (row % 2 === 0) ? 0 : stepX / 2;
    for (let x = -width - stepX; x < width * 2; x += stepX) {
      nodes.push(`<text x="${x + xOffset}" y="${y}" dominant-baseline="middle" style="font-family:${fontFamily}">${safeText}</text>`);
    }
  }

  const css = `
    ${cssFontFace}
    .wm {
      fill: #000;
      fill-opacity: ${opacity};
      font-size: ${fontSize}px;
      letter-spacing: .5px;
    }
  `.trim();

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs><style type="text/css"><![CDATA[${css}]]></style></defs>
      <g class="wm"
         transform="translate(${width/2} ${height/2})
                    rotate(${angle})
                    translate(${-width/2} ${-height/2})">
        ${nodes.join('\n')}
      </g>
    </svg>
  `;

  return Buffer.from(svg);
}
