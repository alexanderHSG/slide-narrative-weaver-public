const { Pool } = require('pg');
import { verifySupabaseSession } from './verifySupabaseSession';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
});

export async function handler (event, context) {

  const { isAuthorized, user } = await verifySupabaseSession(event);
    if (!isAuthorized) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized '}),
      };
    };

  try {
    await pool.query('SELECT NOW()');
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Database connection successful" })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};