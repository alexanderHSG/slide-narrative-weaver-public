import { withNeo4j } from '../_shared/withNeo4j.js';

export const handler = withNeo4j(async ({ session }) => {
  const q = `
    MATCH (d:SLIDE_DECK)

    OPTIONAL MATCH (d)-[:CONTAINS]->(s1:SLIDE)
    WITH d, collect(DISTINCT s1.id) AS ids1

    OPTIONAL MATCH (s2:SLIDE {deck_id: d.deck_id})
    WITH d, ids1, collect(DISTINCT s2.id) AS ids2

    WITH
      coalesce(d.category, 'Other') AS category,
      d,
      reduce(allIds = [], x IN (ids1 + ids2) |
        CASE WHEN x IS NULL OR x IN allIds THEN allIds ELSE allIds + x END
      ) AS allIds

    RETURN
      category,
      collect({
        id: d.deck_id,
        title: d.title,
        slide_count: size(allIds)
      }) AS decks
    ORDER BY category ASC
  `;

  const res = await session.run(q);

  const groups = res.records.map(r => ({
    category: r.get('category'),
    decks: r.get('decks').map(d => ({
      id: d.id,
      title: d.title,
      slide_count: d.slide_count,
      category: r.get('category'),
    })),
  }));

  return { body: groups };
});
