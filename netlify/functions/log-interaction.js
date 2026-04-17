import pkg from 'pg'
import { jwtVerify } from 'jose'
const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

const JWT_SECRET = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET)

export async function verifySupabaseSession(event) {
  const auth = event.headers.authorization || ''
  if (!auth.startsWith('Bearer ')) {
    console.warn('Missing Bearer token')
    return { isAuthorized: false, user: null }
  }
  const token = auth.split(' ')[1]
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return { isAuthorized: true, user: payload }
  } catch (err) {
    console.warn('JWT verify failed:', err.message)
    return { isAuthorized: false, user: null }
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin':      '*',
        'Access-Control-Allow-Headers':     'Content-Type, Authorization',
        'Access-Control-Allow-Methods':     'POST, OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
      }
    }
  }

  console.log('📥 Request:', event.httpMethod)
  console.log('← Authorization header:', event.headers.authorization)

  const { isAuthorized, user } = await verifySupabaseSession(event)
  if (!isAuthorized) {
    return {
      statusCode: 401,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Unauthorized' })
    }
  }

  let client
  try {
    const body = JSON.parse(event.body)
    const {
      user_id,
      session_id,
      action_type,
      status,
      component,
      started_at,
      ended_at,
      duration_ms,
      input_data,
      output_data,
      metadata,
      error_message,
      error_details
    } = body

    client = await pool.connect()

    const insertSQL = `
      INSERT INTO user_interactions (
        user_id, session_id, action_type, status,
        component, started_at, ended_at, duration_ms,
        input_data, output_data, metadata,
        error_message, error_details, created_at
      ) VALUES (
        $1,$2,$3,$4,
        $5,$6,$7,$8,
        $9,$10,$11,
        $12,$13,NOW()
      ) RETURNING *
    `
    const params = [
      user_id,
      session_id,
      action_type,
      status,
      component,
      started_at,
      ended_at,
      duration_ms,
      input_data   ? JSON.stringify(input_data)   : null,
      output_data  ? JSON.stringify(output_data)  : null,
      metadata     ? JSON.stringify(metadata)     : null,
      error_message,
      error_details ? JSON.stringify(error_details) : null
    ]

    const result = await client.query(insertSQL, params)
    console.log('Inserted interaction:', result.rows[0])

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, data: result.rows[0] })
    }
  } catch (err) {
    console.error('Handler error:', err)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    }
  } finally {
    if (client) client.release()
  }
}
