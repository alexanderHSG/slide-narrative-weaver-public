import cookie from 'cookie'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SERVICE_ROLE_KEY, { auth: { persistSession: false } })

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.FRONTEND_URL,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, X-Target-Database',
    'Content-Type': 'application/json'
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { ...corsHeaders(), 'Access-Control-Allow-Methods': 'GET,OPTIONS' } }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  try {
    const cookies = cookie.parse(event.headers.cookie || '')
    const otpToken = cookies['otp-token']
    if (!otpToken) {
      return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ user: null }) }
    }

    const userId = otpToken.replace(/^otp_/, '')
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (error || !data.user) {
      return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ user: null }) }
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        user: { id: data.user.id, email: data.user.email, username: data.user.user_metadata?.username }
      })
    }
  } catch (err) {
    console.error('verify-session error:', err)
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ user: null, error: err.message }) }
  }
}
