import { withNeo4j } from '../_shared/withNeo4j'

const CORS = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL,
  'Access-Control-Allow-Credentials': 'true'
};

export const handler = withNeo4j(async ({ event, session }) => {
  const { objectIds = [] } = JSON.parse(event.body || '{}');

  const result = await session.run(
    `
    MATCH (s:SLIDE)
    WHERE s.object_id IN $objectIds
    OPTIONAL MATCH (d:SLIDE_DECK)-[:CONTAINS]->(s)
    RETURN
      s.object_id AS object_id,
      s.slide_number AS slide_number,
      d.deck_id AS deck_id
    `,
    { objectIds }
  );

  const info = result.records.map(r => ({
    object_id: r.get('object_id'),
    slide_number: Number(r.get('slide_number')?.low ?? r.get('slide_number') ?? 0),
    deck_id: r.get('deck_id')
  }));

  return {
    headers: { 'Content-Type': 'application/json', ...CORS },
    body: { info }
  };
});
