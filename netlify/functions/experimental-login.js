import jwt from 'jsonwebtoken';
import { jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';

const JWT_SECRET_STR = process.env.JWT_SIGNING_KEY;
const JWT_SECRET_BIN = new TextEncoder().encode(JWT_SECRET_STR);
const AUDIENCE       = 'inspira.auth';

const FRONTEND_URL = process.env.VITE_SITE_URL || process.env.FRONTEND_URL || 'http://localhost:8888';
const DEFAULT_NEXT = '/app';

const ENABLE_DEV_ISSUE =
  process.env.ENABLE_DEV_ISSUE === 'true' ||
  process.env.NETLIFY_DEV === 'true' ||
  (process.env.CONTEXT && process.env.CONTEXT !== 'production');

function json(status, obj) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj),
  };
}

function isHttps(event) {
  const xfProto =
    (event.headers?.['x-forwarded-proto'] ||
      event.headers?.['x-forwarded-protocol'] ||
      '').toLowerCase();
  return FRONTEND_URL.startsWith('https://') || xfProto.includes('https');
}

function sanitizeNext(next) {
  return typeof next === 'string' && next.startsWith('/') ? next : DEFAULT_NEXT;
}

export async function handler(event) {
  try {
    const url = new URL(
      event.rawUrl || `http://localhost${event.path}?${event.rawQuery || ''}`
    );
    const tokenInQuery = url.searchParams.get('token');
    const pidParam = (url.searchParams.get('pid') || '').trim();
    const protoParam = (url.searchParams.get('prototype') || '').toUpperCase();
    const next = sanitizeNext(url.searchParams.get('next') || DEFAULT_NEXT);

    let token = tokenInQuery;
    let payload;

    const allowedProto = new Set(['I2', 'C1', 'C2']);

    if (token) {
      let verified;
      try {
        const { payload: pl } = await jwtVerify(token, JWT_SECRET_BIN, {
          audience: AUDIENCE,
        });
        verified = pl;
      } catch (e) {
        return json(403, { error: 'invalid_token', detail: e.message });
      }

      if (!verified?.start_ts) {
        const nowIso = new Date().toISOString();
        const nowSec = Math.floor(Date.now() / 1000);
        const ttlSec = typeof verified?.exp === 'number'
          ? Math.max(60, verified.exp - nowSec)
          : 3 * 60 * 60;

        const pid = verified?.pid;
        const proto = verified?.proto;
        if (!pid) return json(403, { error: 'invalid_token', detail: 'missing_pid_claim' });

        token = jwt.sign(
          { pid, proto, start_ts: nowIso },
          JWT_SECRET_STR,
          { algorithm: 'HS256', audience: AUDIENCE, expiresIn: ttlSec }
        );

        const { payload: pl2 } = await jwtVerify(token, JWT_SECRET_BIN, { audience: AUDIENCE });
        payload = pl2;
      } else {
        payload = verified;
      }
    } else if (pidParam) {

      if (!ENABLE_DEV_ISSUE) {
        return json(403, { error: 'disabled_in_prod' });
      }
      if (!pidParam || pidParam.length > 12) {
        return json(400, { error: 'invalid_pid', detail: 'pid required, max 12 chars' });
      }

      const proto = allowedProto.has(protoParam) ? protoParam : 'C1';
      const nowIso = new Date().toISOString();
      const ttlSec = 3 * 60 * 60;

      token = jwt.sign(
        { pid: pidParam, proto, start_ts: nowIso },
        JWT_SECRET_STR,
        { algorithm: 'HS256', audience: AUDIENCE, expiresIn: ttlSec }
      );

      const { payload: pl } = await jwtVerify(token, JWT_SECRET_BIN, {
        audience: AUDIENCE,
      });
      payload = pl;
    } else {
      return json(403, {
        error: 'missing_credentials',
        detail: 'Provide ?token=<jwt> or ?pid=<id>&prototype=<C1|I2|C2> (dev only)',
      });
    }

    const pid = payload?.pid;
    if (!pid) {
      return json(403, { error: 'invalid_token', detail: 'missing_pid_claim' });
    }

    const SUPA_URL =
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPA_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

    if (SUPA_URL && SUPA_KEY) {
      try {
        const supabase = createClient(SUPA_URL, SUPA_KEY);
        const nowIso = new Date().toISOString();

        const { data: existing, error: selErr } = await supabase
          .from('app_users')
          .select('user_id')
          .eq('user_id', pid)
          .maybeSingle();

        if (selErr) throw selErr;

        if (existing) {
          const { error: updErr } = await supabase
            .from('app_users')
            .update({ user_type: 'experimental', status: 'started' })
            .eq('user_id', pid);
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabase.from('app_users').insert({
            user_id: pid,
            user_type: 'experimental',
            status: 'started',
            started_at: nowIso,
            finished_at: null,
          });
          if (insErr) throw insErr;
        }
      } catch (e) {
        console.warn('[experimental-login] DB write skipped/failed:', e?.message);
      }
    } else {
      console.warn('[experimental-login] missing Supabase envs', {
        HAS_URL: !!SUPA_URL,
        HAS_ROLE: !!SUPA_KEY,
      });
    }

    const secureAttr = isHttps(event) ? '; Secure' : '';
    const cookie = `exp_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=10800${secureAttr}`;

    return {
      statusCode: 302,
      headers: {
        'Set-Cookie': cookie,
        'Cache-Control': 'no-store',
        Location: `${FRONTEND_URL}${next}`,
      },
      body: '',
    };
  } catch (e) {
    console.error('[experimental-login] fatal:', e?.message);
    return json(500, { error: 'internal_error', detail: e?.message });
  }
}
