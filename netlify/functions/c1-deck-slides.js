import { withNeo4j } from '../_shared/withNeo4j.js';

export const handler = withNeo4j(async ({ event, session }) => {
  const deckId = event.queryStringParameters?.id || '';
  if (!deckId) {
    return { statusCode: 400, body: { error: 'deck_id_required' } };
  }

  const parsed = parseInt(event.queryStringParameters?.limit || '400', 10);
  const lim = Math.max(1, Math.min(400, Number.isFinite(parsed) ? parsed : 400));

  const q = `
    MATCH (d:SLIDE_DECK {deck_id: $deckId})
    OPTIONAL MATCH (d)-[:CONTAINS]->(s1:SLIDE)
    WITH d, collect(DISTINCT s1) AS r1
    OPTIONAL MATCH (s2:SLIDE {deck_id: d.deck_id})
    WITH d, r1, collect(DISTINCT s2) AS r2

    WITH d, reduce(sl = [], x IN r1 + r2 |
      CASE WHEN x IS NULL OR x IN sl THEN sl ELSE sl + x END
    ) AS slides
    UNWIND slides AS s
    RETURN
      d.deck_id         AS deck_id,
      d.title           AS deck_title,
      s.id              AS slide_id,
      s.title           AS slide_title,
      s.textual_content AS content,
      s.object_id       AS object_id,
      s.slide_number    AS slide_number
    ORDER BY coalesce(s.slide_number, 0) ASC, toLower(coalesce(s.title, ''))
    LIMIT ${lim}
  `;

  const res = await session.run(q, { deckId });

  const deckTitle = res.records[0]?.get('deck_title') || null;

  const slides = res.records.map(r => {
    const obj = r.get('object_id') || null;
    const slideUrl = obj ? `/.netlify/functions/slide?objectId=${encodeURIComponent(obj)}` : null;

    return {
      id: r.get('slide_id'),
      title: r.get('slide_title'),
      object_id: obj,
      s3Url: slideUrl,
    };
  });

  return { body: { deck_id: deckId, deck_title: deckTitle, slides } };
});
