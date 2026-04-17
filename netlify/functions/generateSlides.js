import 'dotenv/config'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function handler(event, context) {
  context.callbackWaitsForEmptyEventLoop = false

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
    const { title, slideCount, refinementPrompt, outcome } =
      JSON.parse(event.body || '{}')

    const cleanTitle = title.replace(/['"]+/g, '')
    const cleanOutcome = outcome ? outcome.replace(/['"]+/g, '') : ''

    const systemPrompt = `
You are an AI particularly skilled at captivating storytelling for creating presentation slides in a consulting context.
You know how to tell a compelling, structured and exhaustive narrative around any given topic.
Your task is to build a storyline delivered as EXACTLY ${slideCount} storypoints. Those storypoints structure the storyline of the presentation slides.

You will receive a topic${cleanOutcome ? ' and a desired outcome' : ''} and must respond with a JSON map of ${slideCount} crucial storypoints.
Name every key a storypoint (Storypoint 1, Storypoint 2, ..., Storypoint ${slideCount}).
ONLY return the JSON. No extra explanations or greetings.

Topic: ${cleanTitle}${cleanOutcome ? `\nGoal: ${cleanOutcome}` : ''}
`.trim()

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.7,
      max_tokens: 1000
    })

    const storyPointsMap = JSON.parse(
      response.choices[0].message.content || '{}'
    )

    const slideContent = {}
    for (let i = 1; i <= slideCount; i++) {
      const key = `Storypoint ${i}`
      slideContent[`slide${i}Content`] =
        storyPointsMap[key] || `Content for slide ${i} about ${cleanTitle}`
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.FRONTEND_URL,
        'Access-Control-Allow-Credentials': 'true'
      },
      body: JSON.stringify({ slideContent, storyPointsMap })
    }

  } catch (err) {
    console.error('Error in generateSlides handler:', err)
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
