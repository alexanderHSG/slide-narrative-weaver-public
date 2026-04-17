// netlify/functions/evaluateSlides.js

import 'dotenv/config'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function handler(event, context) {
  context.callbackWaitsForEmptyEventLoop = false

  // CORS preflight
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
    const { storyPointDescription, slides } = JSON.parse(event.body || '{}')

    const slidesList = slides
      .map(s => `Slide ${s.slide_number}:\n${s.content}`)
      .join('\n\n')

    const evaluationPrompt = `
Attached are slides retrieved based on the provided description of a story point intended for a presentation. Evaluate each slide according to how accurately and effectively it aligns with this description, scoring each on a scale from 0 (worst fit) to 10 (best fit).

This evaluation aims to transparently guide humans in determining whether the slides can be reused directly or need adaptation. For slides receiving scores below 10, clearly outline what aspects are misaligned or inaccurately reflect the description. Explicitly highlight if different hierarchical views (e.g., parts vs. wholes, subcomponents vs. overarching categories) are incorrectly presented or confused.

Description: "${storyPointDescription}"

Slides:
${slidesList}

Return your evaluation for each slide using the following structured JSON format:

[
  {
    "slide_number": int,
    "score": int,
    "issues": "Concise explanation of the misalignment or inaccuracies if score is less than 10."
  },
  ...
]
    `.trim()

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: evaluationPrompt }],
      temperature: 0,
      max_tokens: 1500
    })

    const content = response.choices[0].message.content?.trim() || ''
    const match = content.match(/\[\s*{[\s\S]*?}\s*\]/)
    if (!match) throw new Error('No JSON array in response')

    const result = JSON.parse(match[0])

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.FRONTEND_URL,
        'Access-Control-Allow-Credentials': 'true'
      },
      body: JSON.stringify({ result })
    }

  } catch (err) {
    console.error('Error in evaluateSlides handler:', err)
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
