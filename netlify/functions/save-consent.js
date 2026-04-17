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

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const { isAuthorized, user } = await verifySupabaseSession(event);
  if (!isAuthorized) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized '}),
    };
  };

  try {
    const { userId, prolificId, consentTimestamp } = JSON.parse(event.body);

    const result = await pool.query(
      `INSERT INTO prolific_consent 
       (prolific_id, consent_timestamp, has_consented) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [prolificId, consentTimestamp, true]
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: result.rows[0] })
    };
  } catch (error) {
    console.error('Error saving consent:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: error.message })
    };
  }
};