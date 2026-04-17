// utils/formatDeckTitle.js
// Cleans noisy deck titles (event codes, dates, versions) and exposes metadata.

const EVENT_RE = /^(?:ISG)\s+(DBS|FWS|SICE|SourceIT|TXBFSI)(?:\s+([A-Z]{2,3}))?\b/i;
const YEAR_RE = /\b(20\d{2})\b/;
const DATE_RE = /\b(20\d{2})[-/.](?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12][0-9]|3[01])\b/;
const VERSION_RE = /\b(v(?:er)?\.?\s*\d+(?:\.\d+)*)\b/i;
const INITIALS_BLOCK_RE = /\b([A-Z]{2,})(?:\s*\+\s*[A-Z]{2,})+\b/;

const norm = (s) =>
  s.replace(/[–—]/g, '-').replace(/\s*-\s*/g, ' - ').replace(/\s{2,}/g, ' ').trim();

function toSmartTitleCase(s) {
  if (!s) return s;
  const small = new Set(['of','and','the','a','an','in','on','for','to','with','at','by','vs','via','from']);
  return s
    .split(' ')
    .map((w, i) => {
      if (/^[A-Z0-9]{2,}$/.test(w)) return w;   // keep acronyms
      const lower = w.toLowerCase();
      if (i > 0 && small.has(lower)) return lower;
      return lower[0]?.toUpperCase() + lower.slice(1);
    })
    .join(' ')
    .replace(/\bAi\b/g, 'AI');
}

export function formatDeckTitle(raw) {
  if (!raw) return { displayTitle: 'Untitled deck', meta: {} };

  let t = norm(raw);
  let event=null, region=null, year=null, date=null, version=null, initials=null;

  const ev = t.match(EVENT_RE);
  if (ev) { event = ev[1].toUpperCase(); region = ev[2]?.toUpperCase() || null; }

  const dt = t.match(DATE_RE);
  if (dt) date = dt[0].replace(/[/.]/g, '-');

  const yr = t.match(YEAR_RE);
  if (yr) year = yr[1];

  const ver = t.match(VERSION_RE);
  if (ver) version = ver[1].replace(/\s+/g, '');

  const init = t.match(INITIALS_BLOCK_RE);
  if (init) {
    const arr = init[0].match(/[A-Z]{2,}/g);
    if (arr?.length) initials = arr.join(', ');
  }

  // strip noise
  t = t
    .replace(EVENT_RE, '')
    .replace(DATE_RE, '')
    .replace(YEAR_RE, '')
    .replace(VERSION_RE, '')
    .replace(/\bSB\b/gi, '')
    .replace(/^\s*-\s*|\s*-\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const parts = t.split(' - ').map(s => s.trim()).filter(Boolean);
  const displayTitle = toSmartTitleCase((parts.sort((a,b)=>b.length-a.length)[0] || raw).trim());

  // subtitle = first non-noise original part different than title
  const originalParts = norm(raw).split(' - ').map(s => s.trim()).filter(Boolean);
  const subtitleCandidate = originalParts.find(p =>
    !EVENT_RE.test(p) && !DATE_RE.test(p) && !YEAR_RE.test(p) && !VERSION_RE.test(p)
  );
  const subtitle = subtitleCandidate && subtitleCandidate !== displayTitle
    ? toSmartTitleCase(subtitleCandidate)
    : null;

  return { displayTitle, subtitle, meta: { event, region, year, date, version, initials } };
}
