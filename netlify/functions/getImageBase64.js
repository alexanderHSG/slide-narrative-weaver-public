import fetch from 'node-fetch';
import { verifySupabaseSession } from './verifySupabaseSession';

export const handler = async (event, context) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  const { isAuthorized } = await verifySupabaseSession(event);
  if (!isAuthorized) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Unauthorized" })
    };
  }

  try {
    const { url } = event.queryStringParameters || {};
    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing url parameter" })
      };
    }

    const decodedUrl = decodeURIComponent(url);

    const res = await fetch(decodedUrl);
    if (!res.ok) {
      throw new Error(`Error fetching image: ${res.statusText}`);
    }
    const buffer = await res.buffer();

    const mimeType = res.headers.get("content-type") || "image/png";
    const base64Data = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ dataUrl })
    };
  } catch (error) {
    console.error("[getImageBase64] error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
