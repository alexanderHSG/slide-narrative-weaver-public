import { withNeo4j } from '../_shared/withNeo4j'

const CORS = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
}

export const handler = withNeo4j(async ({ event, session }) => {
  const { slideIds = [] } = JSON.parse(event.body || '{}')

  await session.run(
    `UNWIND $ids AS slideId
     MATCH (s:SLIDE {id: slideId})
     SET s.onCanvas = true`,
    { ids: slideIds }
  )

  return { headers: CORS, body: { success: true } }
});
