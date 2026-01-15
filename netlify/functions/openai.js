import 'dotenv/config'
import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function getEmbedding(text, model = 'text-embedding-3-large') {
  const res = await openai.embeddings.create({
    model,
    input: text
  })
  return res.data[0].embedding
}
