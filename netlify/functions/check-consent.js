const { Pool } = require('pg');
import { verifySupabaseSession } from './verifySupabaseSession';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
export async function handler (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  const { isAuthorized, user } = await verifySupabaseSession(event);
    if (!isAuthorized) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized '}),
      };
    };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { prolificId } = JSON.parse(event.body);

    const result = await pool.query(
      'SELECT EXISTS(SELECT 1 FROM prolific_consent WHERE prolific_id = $1)',
      [prolificId]
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        hasConsented: result.rows[0].exists
      })
    };
  } catch (error) {
    console.error('Error checking consent:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: error.message })
    };
  }
};