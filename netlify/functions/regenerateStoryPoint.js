import { withNeo4j } from '../_shared/withNeo4j'
import { loadSlides } from './loadSlides.js'

const CORS = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
}

export const handler = withNeo4j(async ({ event, session }) => {
  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, headers: CORS, body: { error: 'Invalid JSON' } }
  }

  const { storyPointId, slideCount = 3, refinementPrompt = '' } = body
  if (!storyPointId) {
    return { statusCode: 400, headers: CORS, body: { error: 'Missing storyPointId' } }
  }
  const countInt = Math.max(0, Math.floor(Number(slideCount)))

  const R = await session.run(
    `MATCH (sp:STORYPOINT {id:$id}) RETURN sp.description AS desc`,
    { id: storyPointId }
  )
  if (!R.records.length) {
    return { statusCode: 404, headers: CORS, body: { error: 'No such STORYPOINT' } }
  }
  const description = R.records[0].get('desc')

  const slides = await loadSlides(
    { description, limit: countInt, guidancePrompt: refinementPrompt, searchType: 'all' },
    session
  )

  return { headers: CORS, body: { slides } }
});
