import { withNeo4j } from '../_shared/withNeo4j'
import { getEmbedding } from './openai.js';

const CORS = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
};

export const handler = withNeo4j(async ({ event, session }) => {
  let payload = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: CORS, body: { error: 'Invalid JSON' } };
  }

  const {
    query = '',
    limit = 3,
    refinementPrompt = '',
    searchType = 'all',
    canvasIds = []
  } = payload;

  const searchText = refinementPrompt ? `${query} ${refinementPrompt}` : query;
  const embedding = await getEmbedding(searchText);

  let typeCond = '';
  if (searchType === 'pdfs') typeCond = "AND s.source = 'pdf'";
  if (searchType === 'stories' && Array.isArray(canvasIds) && canvasIds.length > 0) {
    typeCond += `\n AND s.id IN $canvasIds`;
  }

  const vecQ = `
    MATCH (s:SLIDE)
    WHERE s.embedding IS NOT NULL
      ${typeCond}
    WITH s,
      reduce(dot=0.0,i IN range(0,size(s.embedding)-1)|
        dot + s.embedding[i]*$embedding[i]
      )
      /
      (
        sqrt(reduce(n1=0.0,i IN range(0,size(s.embedding)-1)|
          n1 + s.embedding[i]*s.embedding[i]
        )) *
        sqrt(reduce(n2=0.0,i IN range(0,size($embedding)-1)|
          n2 + $embedding[i]*$embedding[i]
        ))
      )
      AS similarity
    WHERE similarity > 0.3
    RETURN
      s.id               AS slide_id,
      s.title            AS title,
      s.object_id        AS object_id,
      s.textual_content  AS content,
      toInteger(similarity*100) AS percentage,
      similarity         AS raw_score
    ORDER BY similarity DESC
    LIMIT toInteger($limit)
  `;

  const result = await session.run(vecQ, {
    embedding,
    limit: Math.floor(limit),
    canvasIds
  });

  let slides = result.records.map(r => ({
    id:         r.get('slide_id'),
    title:      r.get('title'),
    content:    r.get('content'),
    object_id:  r.get('object_id'),
    percentage: Number(r.get('percentage')?.toNumber?.() ?? r.get('percentage')),
    similarity: r.get('raw_score')
  }));

  if (slides.length < limit) {
    const keywords = searchText
      .split(/\s+/)
      .filter(w => w.length > 3)
      .map(w => w.replace(/'/g, "\\'"));

    if (keywords.length) {
      const cond = keywords.map(w => `s.textual_content CONTAINS '${w}'`).join(' OR ');
      const fbQ = `
        MATCH (s:SLIDE)
        WHERE s.object_id IS NOT NULL
          ${typeCond}
          AND (${cond})
        RETURN
          s.id AS slide_id,
          s.title AS title,
          s.object_id AS object_id,
          s.textual_content AS content
        LIMIT ${Math.max(0, Math.floor(limit) - slides.length)}
      `;
      const fbRes = await session.run(fbQ, { canvasIds });
      const extra = fbRes.records.map(r => ({
        id: r.get('slide_id'),
        title: r.get('title'),
        content: r.get('content'),
        object_id: r.get('object_id'),
        percentage: 50,
        similarity: 0.5
      }));
      const seen = new Set(slides.map(s => s.id));
      slides.push(...extra.filter(s => !seen.has(s.id)));
    }
  }

  slides = slides.map(s => ({
    ...s,
    s3Url: s.object_id
      ? `/.netlify/functions/slide?objectId=${encodeURIComponent(s.object_id)}`
      : null,
  }));

  return { headers: CORS, body: { slides } };
});
