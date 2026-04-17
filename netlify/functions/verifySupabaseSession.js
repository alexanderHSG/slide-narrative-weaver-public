import { jwtVerify, decodeJwt, decodeProtectedHeader } from 'jose';

const JWT_SECRET_STR = process.env.SUPABASE_JWT_SECRET || '';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STR);

function rid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function verifySupabaseSession(event) {
  const requestId = event.headers?.['x-request-id'] || rid();
  const auth = event.headers?.authorization || event.headers?.Authorization || '';

  if (!auth.startsWith('Bearer ')) {
    console.warn(`[verify][${requestId}] Missing Bearer token`);
    return { isAuthorized: false, user: null, reason: 'missing-bearer', requestId };
  }

  const token = auth.slice(7).trim();

  let iss, sub, exp, alg;
  try {
    const header = decodeProtectedHeader(token);
    alg = header?.alg;
  } catch {}
  try {
    const payload = decodeJwt(token);
    iss = payload?.iss; sub = payload?.sub; exp = payload?.exp;
  } catch {}

  if (!JWT_SECRET_STR) {
    console.warn(`[verify][${requestId}] SUPABASE_JWT_SECRET is empty!`);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { algorithms: ['HS256'] });
    console.info(`[verify][${requestId}] OK sub=${sub} iss=${iss} exp=${exp} alg=${alg}`);
    return { isAuthorized: true, user: payload, requestId };
  } catch (err) {
    console.warn(
      `[verify][${requestId}] jwtVerify FAILED: ${err.message} | alg=${alg} iss=${iss} sub=${sub} exp=${exp} | SUPABASE_URL(env)=${process.env.SUPABASE_URL}`
    );
    return { isAuthorized: false, user: null, reason: err.message || 'verify-failed', requestId };
  }
}
