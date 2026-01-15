import { driver as createDriver, auth } from 'neo4j-driver';
import { verifySupabaseSession } from '../functions/verifySupabaseSession.js'
import { supabaseAdmin } from '../functions/supabaseAdminClient.js';
import { jwtVerify } from 'jose';

const ORIGIN = process.env.FRONTEND_URL || 'http://localhost:8888';

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Target-Database',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

const DB_CONFIGS = {
  db_old: {
    uri: process.env.NEO4J_URI,
    user: process.env.NEO4J_USERNAME,
    pass: process.env.NEO4J_PASSWORD,
  },
  db_new: {
    uri: process.env.NEO4J_NEW_URI,
    user: process.env.NEO4J_NEW_USERNAME,
    pass: process.env.NEO4J_NEW_PASSWORD,
  },
};

const drivers = new Map();
function getOrCreateDriver(databaseName) {
  const cfg = DB_CONFIGS[databaseName];
  if (!cfg || !cfg.uri) return null;
  if (drivers.has(databaseName)) return drivers.get(databaseName);
  const drv = createDriver(cfg.uri, auth.basic(cfg.user, cfg.pass), { disableLosslessIntegers: true });
  drivers.set(databaseName, drv);
  return drv;
}

export function cors(statusCode, bodyObj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: bodyObj ? JSON.stringify(bodyObj) : '',
  };
}

const EXP_KEY = new TextEncoder().encode(process.env.JWT_SIGNING_KEY);

function getCookie(name, cookieHeader = '') {
  const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

async function verifyExperimentalSession(event) {
  try {
    const cookie = event.headers?.cookie || '';
    const token = getCookie('exp_session', cookie);
    if (!token) return { isAuthorized: false, reason: 'no_exp_cookie', requestId: cryptoRandomId() };

    const { payload } = await jwtVerify(token, EXP_KEY, { audience: 'inspira.auth' });
    const pid = payload?.pid || null;
    if (!pid) return { isAuthorized: false, reason: 'missing_pid', requestId: cryptoRandomId() };

    return {
      isAuthorized: true,
      user: { id: pid, sub: pid, email: null, auth_kind: 'experimental' },
      reason: 'ok',
      requestId: cryptoRandomId(),
    };
  } catch (e) {
    return { isAuthorized: false, reason: `exp_invalid: ${e.message}`, requestId: cryptoRandomId() };
  }
}

function cryptoRandomId() {
  try {
    return Math.random().toString(36).slice(2, 10);
  } catch { return `${Date.now()}`; }
}

function normalizeDbName(v) {
  const x = String(v || '').trim().toLowerCase();
  return x === 'db_new' ? 'db_new' : x === 'db_old' ? 'db_old' : '';
}

export async function openNeo4jForRequest(event) {
  let authKind = 'none';
  let authResult = await verifySupabaseSession(event);

  if (authResult?.isAuthorized) {
    authKind = 'named';
  } else {
    authResult = await verifyExperimentalSession(event);
    if (authResult?.isAuthorized) {
      authKind = 'experimental';
    } else {
      const reason = authResult?.reason || 'unauthorized';
      const requestId = authResult?.requestId || cryptoRandomId();
      return {
        error: {
          statusCode: 401,
          headers: { 'X-Auth-Debug': reason, 'X-Req-Id': requestId, ...CORS_HEADERS },
          body: { error: 'Unauthorized' }
        }
      };
    }
  }

  const { user, requestId } = authResult;
  const userId = user?.sub || user?.id;
  const email = (user?.email || '').toLowerCase();

  const { data: me, error: meErr } = await supabaseAdmin
    .from('app_users')
    .select('role, preferred_db, email')
    .eq('user_id', userId)
    .maybeSingle();

  if (meErr) {
    return { error: { statusCode: 500, headers: { 'X-Req-Id': requestId, ...CORS_HEADERS }, body: { error: meErr.message } } };
  }

  const role = (me?.role || 'user').toLowerCase();
  const dbFromProfile = normalizeDbName(me?.preferred_db || 'db_old');

  const hdr = event.headers || {};
  const hdrOverride = hdr['x-target-database'] || hdr['X-Target-Database'];
  const wanted = normalizeDbName(hdrOverride);
  const canOverride = role === 'admin' && !!wanted;
  const databaseName = canOverride ? wanted : dbFromProfile;
  const overrideUsed = canOverride && wanted !== '' && wanted !== dbFromProfile ? '1' : '0';

  const cfg = DB_CONFIGS[databaseName];
  if (!cfg || !cfg.uri) {
    return {
      error: {
        statusCode: 400,
        headers: { 'X-Req-Id': requestId, 'X-Resolved-Database': databaseName, 'X-Override-Used': overrideUsed, ...CORS_HEADERS },
        body: { error: `Configuration for database "${databaseName}" not found` }
      }
    };
  }

  const driver = getOrCreateDriver(databaseName);
  const session = driver.session();

  return { session, driver, databaseName, role, email, userId, requestId, overrideUsed, authKind };
}
