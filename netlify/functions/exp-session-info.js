import cookie from 'cookie';
import { jwtVerify, decodeJwt } from 'jose';

const FRONTEND_URL =
  process.env.VITE_SITE_URL || process.env.FRONTEND_URL || 'http://localhost:8888';

const JWT_SIGNING_KEY = (process.env.JWT_SIGNING_KEY || '').trim();
const JWT_KEY_BIN = JWT_SIGNING_KEY ? new TextEncoder().encode(JWT_SIGNING_KEY) : null;
const AUDIENCE = 'inspira.auth';

const CONFIG_TTL_MIN =
  Number.parseInt(process.env.EXP_SESSION_DEFAULT_TTL_MINUTES || process.env.EXP_SESSION_TTL_MINUTES || '', 10);
const CONFIG_TTL_MIN_VALID = Number.isFinite(CONFIG_TTL_MIN) ? CONFIG_TTL_MIN : null;

const CORS = {
  'Access-Control-Allow-Origin': FRONTEND_URL,
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function isHttps(event) {
  const xfp = (event.headers?.['x-forwarded-proto'] || '').toLowerCase();
  return xfp.includes('https') || FRONTEND_URL.startsWith('https://');
}

function clearExpCookieHeaders(event) {
  const secure = isHttps(event);
  const base = { httpOnly: true, sameSite: 'Lax', path: '/', maxAge: 0, secure };
  return [
    cookie.serialize('exp_session', '', base),
    cookie.serialize('exp_session', '', { ...base, secure: !secure }),
  ];
}

function parseCookie(event) {
  const raw = event.headers?.cookie || event.headers?.Cookie || '';
  return cookie.parse(raw || '');
}

function iso(ts) {
  return ts ? new Date(ts).toISOString() : null;
}

export async function handler(event) {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers: CORS, body: '' };
    }

    const now = Date.now();
    const cookies = parseCookie(event);
    const token = cookies['exp_session'] || '';
    const hasCookie = Boolean(token);
    const basePayload = {
      hasCookie,
      valid: false,
      expired: false,
      pid: null,
      issuedAt: null,
      expiresAt: null,
      remainingSeconds: null,
      aud: null,
      configuredDefaultTtlMinutes: CONFIG_TTL_MIN_VALID,
      serverTime: iso(now),
    };

    if (!hasCookie) {
      return {
        statusCode: 200,
        headers: { ...CORS, 'Cache-Control': 'no-store' },
        body: JSON.stringify({ ...basePayload, reason: 'no-cookie' }),
      };
    }

    if (!JWT_KEY_BIN) {
      let decoded = {};
      try { decoded = decodeJwt(token) || {}; } catch {}
      const expMs = decoded.exp ? decoded.exp * 1000 : null;
      const iatMs = decoded.iat ? decoded.iat * 1000 : null;
      const rem = Number.isFinite(expMs) ? Math.floor((expMs - now) / 1000) : null;

      return {
        statusCode: 200,
        headers: { ...CORS, 'Cache-Control': 'no-store' },
        body: JSON.stringify({
          ...basePayload,
          pid: decoded.pid || null,
          issuedAt: iso(iatMs),
          expiresAt: iso(expMs),
          remainingSeconds: rem,
          aud: decoded.aud || null,
          reason: 'server-misconfig',
        }),
      };
    }

    try {
      const { payload } = await jwtVerify(token, JWT_KEY_BIN, {
        algorithms: ['HS256'],
        audience: AUDIENCE,
      });

      const expMs = payload.exp ? payload.exp * 1000 : null;
      const iatMs = payload.iat ? payload.iat * 1000 : null;
      const remainingSeconds =
        Number.isFinite(expMs) ? Math.floor((expMs - now) / 1000) : null;

      return {
        statusCode: 200,
        headers: { ...CORS, 'Cache-Control': 'no-store' },
        body: JSON.stringify({
          ...basePayload,
          hasCookie: true,
          valid: true,
          expired: false,
          pid: payload.pid || null,
          issuedAt: iso(iatMs),
          expiresAt: iso(expMs),
          remainingSeconds,
          aud: payload.aud || null,
        }),
      };
    } catch (e) {
      let decoded = {};
      try { decoded = decodeJwt(token) || {}; } catch {}

      const expMs = decoded.exp ? decoded.exp * 1000 : null;
      const iatMs = decoded.iat ? decoded.iat * 1000 : null;
      const remainingSeconds =
        Number.isFinite(expMs) ? Math.floor((expMs - now) / 1000) : null;

      const isExpired = e?.code === 'ERR_JWT_EXPIRED' || /expired/i.test(e?.message || '');

      return {
        statusCode: 200,
        headers: {
          ...CORS,
          'Cache-Control': 'no-store',
          ...(isExpired ? { 'Set-Cookie': clearExpCookieHeaders(event) } : {}),
        },
        body: JSON.stringify({
          ...basePayload,
          hasCookie: true,
          valid: false,
          expired: Boolean(isExpired),
          pid: decoded.pid || null,
          issuedAt: iso(iatMs),
          expiresAt: iso(expMs),
          remainingSeconds,
          aud: decoded.aud || null,
          reason: isExpired ? 'expired' : 'invalid',
        }),
      };
    }
  } catch (err) {
    console.error('[exp-session-info] fatal:', err?.message);
    return {
      statusCode: 500,
      headers: { ...CORS, 'Cache-Control': 'no-store' },
      body: JSON.stringify({ error: 'internal-error' }),
    };
  }
}
