import { verifySupabaseSession } from './verifySupabaseSession.js';
import { supabaseAdmin } from './supabaseAdminClient.js';

const CORS = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};
const ROLES = new Set(['admin','user','beta']);

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

  const role = String(payload.role || 'user');
  const email = String(payload.email || '').trim().toLowerCase();
  const user_id = payload.user_id ? String(payload.user_id) : null;
  const preferred_db = payload.preferred_db ? String(payload.preferred_db) : null;
  const user_type = String(payload.user_type || 'named');
  const sendInvite = Boolean(payload.send_invite);
  if (!ROLES.has(role)) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid role' }) };
  if (!user_id && !email) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Provide user_id or email' }) };

  let targetUserId = user_id;

  if (!targetUserId && email) {
    try {
      if (supabaseAdmin?.auth?.admin?.inviteUserByEmail) {
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
        if (error) throw error;
        targetUserId = data?.user?.id;
      } else if (supabaseAdmin?.auth?.admin?.createUser) {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, email_confirm: !sendInvite });
        if (error) throw error;
        targetUserId = data?.user?.id || data?.id;
      }
    } catch (e) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: `Auth create failed: ${e.message}` }) };
    }
  }

  if (!targetUserId) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Could not resolve user_id' }) };
  }

  const upsertObj = {
    user_id: targetUserId,
    user_type,
    role,
    email: email || null,
    status: 'started',
  };
  if (preferred_db) upsertObj.preferred_db = preferred_db;

  const { data, error } = await supabaseAdmin
    .from('app_users')
    .upsert(upsertObj, { onConflict: 'user_id' })
    .select('user_id, email, role, user_type, status, started_at, finished_at, preferred_db')
    .single();

  if (error) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: error.message }) };
  return { statusCode: 200, headers: CORS, body: JSON.stringify({ item: data }) };
}
