import { createClient } from '@supabase/supabase-js'
import cookie from 'cookie'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY
const FRONTEND_URL = process.env.FRONTEND_URL

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

export async function handler(event, context) {
  context.callbackWaitsForEmptyEventLoop = false

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': FRONTEND_URL,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
      }
    }
  }

  if (event.httpMethod === 'POST') {
    const { email, password } = JSON.parse(event.body)

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    })

    if (error || !data.session) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': FRONTEND_URL,
          'Access-Control-Allow-Credentials': 'true',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: error?.message || 'Login failed' })
      }
    }

    const { access_token, refresh_token, expires_in } = data.session
    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path: '/'
    }

    return {
      statusCode: 200,
      headers: {
        'Set-Cookie': [
          cookie.serialize('sb-access-token', access_token, {
            ...cookieOpts,
            maxAge: expires_in
          }),
          cookie.serialize('sb-refresh-token', refresh_token, {
            ...cookieOpts,
            maxAge: 60 * 60 * 24 * 30
          })
        ],
        'Access-Control-Allow-Origin': FRONTEND_URL,
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user: data.user })
    }
  }

  return await supabaseAdmin.auth.api.setAuthCookie(event, context)
}
