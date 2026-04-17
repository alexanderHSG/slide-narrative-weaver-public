import { verifySupabaseSession } from './verifySupabaseSession.js';
import { supabaseAdmin } from './supabaseAdminClient.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

function getBearerToken(event) {
  const h = event.headers || {};
  const auth = h.authorization || h.Authorization || '';
  const [, token] = auth.split(' ');
  return token || null;
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const { isAuthorized, user: verifiedUser } = await verifySupabaseSession(event);
  if (!isAuthorized) {
    return { statusCode: 401, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  let userId = verifiedUser?.id ?? null;
  let email = (verifiedUser?.email || '').toLowerCase();

  if (!userId) {
    const token = getBearerToken(event);
    if (token) {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && data?.user) {
        userId = data.user.id;
        email = (data.user.email || email || '').toLowerCase();
      }
    }
  }

  if (!userId) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Invalid session: missing user id' })
    };
  }

  try {
    const { data: me, error } = await supabaseAdmin
      .from('app_users')
      .select('user_id, email, role, preferred_db')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: error.message }) };
    }

    if (!me) {
      const seed = {
        user_id: userId,
        user_type: 'named',
        status: 'started',
        role: 'user',
        email,
        preferred_db: 'db_old'
      };

      const { data: created, error: upErr } = await supabaseAdmin
        .from('app_users')
        .upsert(seed, { onConflict: 'user_id' })
        .select('user_id, email, role, preferred_db')
        .maybeSingle();

      if (upErr) {
        return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: upErr.message }) };
      }
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(created) };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        email: me.email || email,
        role: me.role || 'user',
        preferred_db: me.preferred_db || 'db_old'
      })
    };
  } catch (err) {
    console.error('get-profile error:', err);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) };
  }
}
