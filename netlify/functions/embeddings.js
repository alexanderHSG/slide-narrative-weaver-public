// netlify/functions/embeddings.js

import 'dotenv/config'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function handler(event, context) {
  context.callbackWaitsForEmptyEventLoop = false

  // Pre-flight CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': process.env.FRONTEND_URL,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Credentials': 'true'
      }
    }
  }

  try {
    const { input, model } = JSON.parse(event.body || '{}')
    // jedno lub wiele punktów: jeśli input jest tablicą, to zwracamy listę embeddings
    if (Array.isArray(input)) {
      const resp = await openai.embeddings.create({ model, input })
      const embeddings = resp.data.map(e => e.embedding)
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': process.env.FRONTEND_URL,
          'Access-Control-Allow-Credentials': 'true'
        },
        body: JSON.stringify({ embeddings })
      }
    } else {
      const resp = await openai.embeddings.create({ model, input: [input] })
      const embedding = resp.data[0].embedding
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': process.env.FRONTEND_URL,
          'Access-Control-Allow-Credentials': 'true'
        },
        body: JSON.stringify({ embedding })
      }
    }
  } catch (err) {
    console.error('Error in embeddings handler:', err)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.FRONTEND_URL,
        'Access-Control-Allow-Credentials': 'true'
      },
      body: JSON.stringify({ error: err.message })
    }
  }
}
