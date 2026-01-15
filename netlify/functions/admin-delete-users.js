import { verifySupabaseSession } from './verifySupabaseSession.js';
import { supabaseAdmin } from './supabaseAdminClient.js';

const CORS = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS };

  const { isAuthorized, user } = await verifySupabaseSession(event);
  if (!isAuthorized) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };

  const myId = user.id;
  const myEmail = (user.email || '').toLowerCase();
  const myDomain = myEmail.split('@')[1] || '';
  const { data: me } = await supabaseAdmin.from('app_users').select('role').eq('user_id', myId).maybeSingle();
  let isAdmin = me?.role === 'admin';
  if (!isAdmin) {
    const { data: allow } = await supabaseAdmin
      .from('allowed_emails')
      .select('email_suffix')
      .or(`email_suffix.eq.${myEmail},email_suffix.eq.${myDomain}`)
      .limit(1);
    isAdmin = !!(allow && allow.length);
  }
  if (!isAdmin) return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Admins only' }) };

  let payload; try { payload = JSON.parse(event.body || '{}'); } catch { payload = {}; }
  const user_id = String(payload.user_id || '').trim();
  const alsoDeleteAuth = Boolean(payload.alsoDeleteAuth);
  if (!user_id) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing user_id' }) };

  const { error } = await supabaseAdmin.from('app_users').delete().eq('user_id', user_id);
  if (error) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: error.message }) };

  if (alsoDeleteAuth && supabaseAdmin?.auth?.admin?.deleteUser) {
    try {
      await supabaseAdmin.auth.admin.deleteUser(user_id);
    } catch (e) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: `Auth delete failed: ${e.message}` }) };
    }
  }

  return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true }) };
}
