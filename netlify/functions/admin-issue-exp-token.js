import jwt from 'jsonwebtoken';
import { verifySupabaseSession } from './verifySupabaseSession.js';
import { supabaseAdmin } from './supabaseAdminClient.js';

const CORS = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:8888',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const JWT_SECRET   = process.env.JWT_SIGNING_KEY;
const AUDIENCE     = 'inspira.auth';
const FRONTEND_URL = process.env.VITE_SITE_URL || process.env.FRONTEND_URL || 'http://localhost:8888';

function json(status, body) {
  return { statusCode: status, headers: CORS, body: JSON.stringify(body) };
}
function clamp(n, min, max) {
  const v = Number(n || 0);
  return Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS };
  if (event.httpMethod !== 'POST')   return json(405, { error: 'method_not_allowed' });
  if (!JWT_SECRET)                   return json(500, { error: 'missing_jwt_signing_key' });

  const { isAuthorized, user, reason, requestId } = await verifySupabaseSession(event);
  if (!isAuthorized) return json(401, { error: 'unauthorized', reason, requestId });

  const myUserId = user?.sub || null;
  const myEmail  = (user?.email || '').toLowerCase();

  if (!myUserId) return json(401, { error: 'unauthorized', reason: 'no-sub-in-jwt' });

  try {
    const { data: me, error: selErr } = await supabaseAdmin
      .from('app_users')
      .select('role')
      .eq('user_id', myUserId)
      .maybeSingle();

    if (selErr) return json(500, { error: 'role_lookup_failed', detail: selErr.message });
    if (me?.role !== 'admin') return json(403, { error: 'forbidden', detail: 'Admins only' });
  } catch (e) {
    return json(500, { error: 'role_query_failed', detail: e?.message });
  }

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'bad_json' }); }

  const pid       = String(payload.pid || '').trim();
  const prototype = ['I1', 'I2', 'C1', 'C2'].includes(payload.prototype) ? payload.prototype : 'I1';
  const ttl       = clamp(payload.ttl, 60, 86400);
  const next      = (typeof payload.next === 'string' && payload.next.startsWith('/')) ? payload.next : '/app';

  if (!pid) return json(400, { error: 'missing_pid' });

  const now = Math.floor(Date.now() / 1000);
  const token = jwt.sign(
    { pid, proto: prototype, iat: now, exp: now + ttl, aud: 'inspira.auth' },
    JWT_SECRET,
    { algorithm: 'HS256' }
  );

  const login_url = `${FRONTEND_URL}/.netlify/functions/experimental-login?token=${encodeURIComponent(token)}&next=${encodeURIComponent(next)}`;

  return json(200, {
    token,
    login_url,
    prototype,
    expires_in: ttl,
    issued_by: myEmail || myUserId,
  });
}
