import { jwtVerify } from 'jose';
const JWT = new TextEncoder().encode(process.env.JWT_SIGNING_KEY || '');

export async function getExperimentalIdentityFromCookie(event) {
  const cookieHeader = event.headers?.cookie || event.headers?.Cookie || '';
  const m = cookieHeader.match(/(?:^|;\s*)exp_session=([^;]+)/);
  if (!m) return null;

  const token = decodeURIComponent(m[1]);
  const { payload } = await jwtVerify(token, JWT, { audience: 'inspira.auth' });

  const pid = payload?.pid || null;
  const ts = payload?.start_ts || (payload?.iat ? new Date(payload.iat * 1000).toISOString() : null);

  if (!pid || !ts) return null;
  return { pid, ts };
}
