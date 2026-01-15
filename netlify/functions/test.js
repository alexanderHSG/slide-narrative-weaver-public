import { verifySupabaseSession } from './verifySupabaseSession.js';

const headers = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Target-Database',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

export async function handler (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  const { isAuthorized } = await verifySupabaseSession(event);
  if (!isAuthorized) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  return { statusCode: 200, headers, body: JSON.stringify({ message: 'Netlify functions are working' }) };
};
