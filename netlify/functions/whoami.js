import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SIGNING_KEY);
const ORIGIN     = process.env.FRONTEND_URL || 'http://localhost:8888';

function cors(extra = {}) {
  return {
    'Access-Control-Allow-Origin': ORIGIN,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Target-Database',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    ...extra,
  };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors() };
  }

  try {
    const cookieHeader = event.headers.cookie || event.headers.Cookie || '';
    const m = cookieHeader.match(/(?:^|;\s*)exp_session=([^;]+)/);
    if (!m) {
      return { statusCode: 401, headers: cors(), body: JSON.stringify({ pid: null }) };
    }

    const token = decodeURIComponent(m[1]);
    const { payload } = await jwtVerify(token, JWT_SECRET, { audience: 'inspira.auth' });

    return {
      statusCode: 200,
      headers: cors(),
      body: JSON.stringify({
        pid: payload?.pid ?? null,
        prototype: payload?.proto ?? null,
      }),
    };
  } catch {
    return { statusCode: 401, headers: cors(), body: JSON.stringify({ pid: null }) };
  }
}
