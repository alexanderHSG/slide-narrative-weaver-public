import { getEmbedding } from './openai';

const embeddingCache = new Map()

export default async function getCachedEmbedding(text) {
  if (embeddingCache.has(text)) {
    return embeddingCache.get(text)
  }

  const embedding = await getEmbedding(text)
  embeddingCache.set(text, embedding)
  return embedding
}
