import 'dotenv/config'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function handler(event, context) {
  context.callbackWaitsForEmptyEventLoop = false

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': process.env.FRONTEND_URL,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Target-Database',
        'Access-Control-Allow-Credentials': 'true'
      }
    }
  }

  try {
    const { description } = JSON.parse(event.body || '{}')
    const cleanDesc = (description || '').replace(/["']/g, '').trim()

    const systemPrompt = `
      You are an assistant who generates catchy, concise, and informative titles for consulting related storypoints that are used to structure presentation slides.
      Given a storypoint description, write a single short title (no more than 4 words) that summarizes and captures the main idea in a clear, engaging way. The title should read naturally, like a chapter heading, and start with a capital letter. Do not use punctuation, numbers, or quotation marks.
      Description:
      ${cleanDesc}
      Title:
    `.trim()

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.4,
      max_tokens: 20
    })

    let title = response.choices[0].message.content
      .replace(/^Title:\s*/i, '')
      .replace(/["'.]/g, '')
      .trim()

    if (!title) title = cleanDesc.slice(0, 32)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.FRONTEND_URL,
        'Access-Control-Allow-Credentials': 'true'
      },
      body: JSON.stringify({ title })
    }

  } catch (err) {
    console.error('Error in shortTitle handler:', err)
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
