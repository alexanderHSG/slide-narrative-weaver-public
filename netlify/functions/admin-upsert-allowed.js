import { verifySupabaseSession } from './verifySupabaseSession.js';
import { supabaseAdmin } from './supabaseAdminClient.js';
import { ensureUserProfile, requireAdmin } from './ensureUserProfile.js';

const CORS = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Target-Database',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS };

  const { isAuthorized, user } = await verifySupabaseSession(event);
  if (!isAuthorized) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };

  await ensureUserProfile(user);
  if (!(await requireAdmin(user))) {
    return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Admins only' }) };
  }

  let payload; try { payload = JSON.parse(event.body || '{}'); } catch { payload = {}; }

  let suffix = String(payload.email_suffix || '').trim().toLowerCase();
  if (!suffix) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing email_suffix' }) };

  while (suffix.startsWith('@') || suffix.startsWith('.')) suffix = suffix.slice(1);
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(suffix);
  const isDomain = !isEmail && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(suffix);
  if (!isEmail && !isDomain) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Provide a full email or a domain' }) };
  }

  const { data, error } = await supabaseAdmin
    .from('allowed_emails')
    .upsert({ email_suffix: suffix }, { onConflict: 'email_suffix' })
    .select('email_suffix')
    .single();

  if (error) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: error.message }) };
  return { statusCode: 200, headers: CORS, body: JSON.stringify({ item: data }) };
}
