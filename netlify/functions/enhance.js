import 'dotenv/config'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
  'Access-Control-Allow-Credentials': 'true'
}

export async function handler(event, context) {
  context.callbackWaitsForEmptyEventLoop = false

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        ...CORS_HEADERS,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    }
  }

  try {
    const { description, refinementPrompt } = JSON.parse(event.body || '{}')

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content:
            'You are an AI assistant specializing in refining concise, insightful, and engaging descriptions that serve as guiding story points for presentation slides. You will receive a single story point description extracted from a larger narrative context that you do not have access to, along with a specific user instruction. Return ONLY the improved description.'
        },
        {
          role: 'user',
          content: `Current description: "${description}"\n\nInstructions: ${refinementPrompt}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    })

    const enhanced = response.choices[0].message.content.trim()

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS
      },
      body: JSON.stringify({ enhanced })
    }

  } catch (err) {
    console.error('OpenAI error in enhance:', err)

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS
      },
      body: JSON.stringify({ error: err.message || 'Enhancement failed' })
    }
  }
}
