import { supabaseAdmin } from './supabaseAdminClient.js';

export async function ensureUserProfile(user) {
  const email = (user.email || '').toLowerCase();
  await supabaseAdmin
    .from('app_users')
    .upsert({
      user_id: user.id,
      user_type: 'named',
      status: 'started',
      role: 'user',
      email
    }, { onConflict: 'user_id' });
}

export async function requireAdmin(user) {
  const email = (user.email || '').toLowerCase();

  let { data: me, error } = await supabaseAdmin
    .from('app_users')
    .select('role, email')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;

  if (!me) {
    const { data } = await supabaseAdmin
      .from('app_users')
      .select('role, email')
      .eq('email', email)
      .maybeSingle();
    me = data || null;
  }

  return me?.role === 'admin';
}
