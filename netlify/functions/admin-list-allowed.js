import { verifySupabaseSession } from './verifySupabaseSession.js';
import { supabaseAdmin } from './supabaseAdminClient.js';
import { ensureUserProfile, requireAdmin } from './ensureUserProfile.js';

const CORS = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Target-Database',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: CORS };

  const { isAuthorized, user } = await verifySupabaseSession(event);
  if (!isAuthorized) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };

  await ensureUserProfile(user);

  const isAdmin = await requireAdmin(user);
  if (!isAdmin) return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Admins only' }) };

  const { data, error } = await supabaseAdmin
    .from('allowed_emails')
    .select('email_suffix')
    .order('email_suffix', { ascending: true });

  if (error) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: error.message }) };
  return { statusCode: 200, headers: CORS, body: JSON.stringify({ items: data || [] }) };
}
