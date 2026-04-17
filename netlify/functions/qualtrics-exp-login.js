import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.VITE_SITE_URL || 'http://localhost:8888';
const SHARED = (process.env.QUALTRICS_SHARED_SECRET || '').trim();
const AUD = 'inspira.auth';

function json(status, obj, extraHeaders = {}) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(obj),
  };
}

function isHttps(event) {
  const xf = (event.headers?.['x-forwarded-proto'] || event.headers?.['x-forwarded-protocol'] || '').toLowerCase();
  return FRONTEND_URL.startsWith('https://') || xf.includes('https');
}
function sanitizeNext(next) {
  return typeof next === 'string' && next.startsWith('/') ? next : '/app';
}
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': FRONTEND_URL,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };
}
function makePid(raw) {
  const trimmed = (raw || '').trim();
  if (trimmed) return trimmed;
  try {
    return `q-${crypto.randomUUID().slice(0, 8)}`;
  } catch {
    return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  }
}

function parseInput(event) {
  if (event.httpMethod === 'GET') {
    const url = new URL(event.rawUrl || `http://localhost${event.path}?${event.rawQuery || ''}`);
    return {
      pid: url.searchParams.get('pid'),
      prototype: url.searchParams.get('prototype'),
      ttl: url.searchParams.get('ttl'),
      next: url.searchParams.get('next'),
    };
  }
  try { return JSON.parse(event.body || '{}'); } catch { return {}; }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { ...corsHeaders() } };
  }
  if (!['POST', 'GET'].includes(event.httpMethod)) {
    return json(405, { error: 'method_not_allowed' }, corsHeaders());
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const provided = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!SHARED) return json(500, { error: 'missing_QUALTRICS_SHARED_SECRET' }, corsHeaders());
  if (!provided) return json(401, { error: 'missing_auth_header' }, corsHeaders());
  if (provided !== SHARED) return json(403, { error: 'forbidden', detail: 'bad_shared_secret' }, corsHeaders());

  const body = parseInput(event);

  const pid = makePid(body.pid);
  const allowedProto = new Set(['I1','I2','C1','C2']);
  const protoIn = String(body.prototype || '').toUpperCase();
  const proto = allowedProto.has(protoIn) ? protoIn : 'I1';

  const ttlSec = Math.max(60, Math.min(24 * 60 * 60, parseInt(body.ttl || 10800, 10) || 10800));
  const next = sanitizeNext(body.next);

  const secret = process.env.JWT_SIGNING_KEY;
  if (!secret) return json(500, { error: 'missing_JWT_SIGNING_KEY' }, corsHeaders());

  const startTs = new Date().toISOString();

  const token = jwt.sign(
    { pid, proto, start_ts: startTs },
    secret,
    { algorithm: 'HS256', audience: AUD, expiresIn: ttlSec }
  );

  const loginUrl = `${FRONTEND_URL}/.netlify/functions/experimental-login?token=${encodeURIComponent(token)}&next=${encodeURIComponent(next)}`;

  return json(
    200,
    {
      ok: true,
      pid,
      prototype: proto,
      expires_in: ttlSec,
      token,
      login_url: loginUrl,
      https: isHttps(event),
    },
    corsHeaders()
  );
}
