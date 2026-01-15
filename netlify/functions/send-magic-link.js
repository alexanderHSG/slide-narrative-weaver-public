import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': FRONTEND_URL || '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, X-Target-Database',
    'Content-Type': 'application/json'
  };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders() };
  }

  const { email } = JSON.parse(event.body || '{}');

  const { error } = await supabaseAdmin.auth.signInWithOtp({
    email,
    options: { redirectTo: FRONTEND_URL }
  });

  if (error) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ success: false, error: error.message }) };
  }

  return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ success: true }) };
}
