import cookie from 'cookie';

export async function handler(event) {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8888';
  const xfp = (event.headers['x-forwarded-proto'] || '').toLowerCase();
  const isHttps = xfp.includes('https') || FRONTEND_URL.startsWith('https');

  const baseHeaders = {
    'Access-Control-Allow-Origin': FRONTEND_URL,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Target-Database',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: { ...baseHeaders, 'Access-Control-Allow-Methods': 'POST,OPTIONS' },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...baseHeaders, 'Access-Control-Allow-Methods': 'POST,OPTIONS' },
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' }),
    };
  }

  const common = {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 0,
  };

  const cookies = [
    cookie.serialize('otp-token',        '', { ...common, secure: isHttps }),
    cookie.serialize('sb-access-token',  '', { ...common, secure: isHttps }),
    cookie.serialize('sb-refresh-token', '', { ...common, secure: isHttps }),
  ];

  cookies.push(
    cookie.serialize('exp_session', '', { ...common, secure: true }),
    cookie.serialize('exp_session', '', { ...common, secure: false }),
  );

  return {
    statusCode: 200,
    headers: baseHeaders,
    multiValueHeaders: { 'Set-Cookie': cookies },
    body: JSON.stringify({ success: true }),
  };
}
