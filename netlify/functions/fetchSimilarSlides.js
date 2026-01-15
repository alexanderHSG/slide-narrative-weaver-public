import { withNeo4j } from '../_shared/withNeo4j'

const CORS = { 'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*', 'Access-Control-Allow-Credentials': 'true' };

export const handler = withNeo4j(async ({ event, session }) => {
  const { embedding, limit = 5, searchType = 'all', canvasIds = [] } = JSON.parse(event.body || '{}');
  if (!Array.isArray(embedding)) throw new Error('`embedding` must be an array');

  let q = `
    MATCH (s:SLIDE)
    WHERE s.embedding IS NOT NULL
  `;
  if (searchType === 'stories' && Array.isArray(canvasIds) && canvasIds.length > 0) {
    q += ` AND s.id IN $canvasIds `;
  }
  q += `
    WITH s,
      reduce(dot = 0.0, i IN range(0, size(s.embedding)-1) |
        dot + s.embedding[i] * $embedding[i]
      ) /
      (
        sqrt(reduce(n1 = 0.0, i IN range(0, size(s.embedding)-1) |
          n1 + s.embedding[i] * s.embedding[i]
        )) *
        sqrt(reduce(n2 = 0.0, i IN range(0, size($embedding)-1) |
          n2 + $embedding[i] * $embedding[i]
        ))
      ) AS similarity
    WHERE similarity > 0
    RETURN
      s.id               AS id,
      s.title            AS title,
      s.object_id        AS object_id,
      s.textual_content  AS content,
      toInteger(similarity * 100) AS percentage,
      similarity         AS similarity
    ORDER BY similarity DESC
    LIMIT toInteger($limit)
  `;

  const res = await session.run(q, { embedding, limit, canvasIds });
  const slides = res.records.map(r => ({
    id:         r.get('id'),
    title:      r.get('title'),
    object_id:  r.get('object_id'),
    content:    r.get('content'),
    percentage: Number(r.get('percentage')?.toNumber?.() ?? r.get('percentage')),
    similarity: r.get('similarity')
  }));

  return { headers: CORS, body: { slides } };
});
