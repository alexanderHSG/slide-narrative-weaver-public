import { verifySupabaseSession } from './verifySupabaseSession.js';
import { supabaseAdmin } from './supabaseAdminClient.js';

const CORS = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: CORS };

  const { isAuthorized, user } = await verifySupabaseSession(event);
  if (!isAuthorized) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };

  const myId = user.id;
  const myEmail = (user.email || '').toLowerCase();
  const myDomain = myEmail.split('@')[1] || '';
  const { data: me } = await supabaseAdmin
    .from('app_users')
    .select('role,email')
    .eq('user_id', myId)
    .maybeSingle();
  let isAdmin = me?.role === 'admin';
  if (!isAdmin) {
    const { data: allow } = await supabaseAdmin
      .from('allowed_emails')
      .select('email_suffix')
      .or(`email_suffix.eq.${myEmail},email_suffix.eq.${myDomain}`)
      .limit(1);
    isAdmin = !!(allow && allow.length);
  }
  if (!isAdmin) {
    return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Admins only' }) };
  }

  const { data, error } = await supabaseAdmin
    .from('app_users')
    .select('user_id, email, role, user_type, status, started_at, finished_at, preferred_db')
    .order('started_at', { ascending: false });

  if (error) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: error.message }) };
  return { statusCode: 200, headers: CORS, body: JSON.stringify({ items: data || [] }) };
}
