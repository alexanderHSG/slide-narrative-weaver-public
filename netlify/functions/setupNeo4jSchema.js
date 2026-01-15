import { withNeo4j } from '../_shared/withNeo4j'

export const handler = withNeo4j(async ({ session, role }) => {
  if (role !== 'admin') {
    return { statusCode: 403, body: { error: 'Admins only' } };
  }

  const indexesResult = await session.run(`
    SHOW INDEXES
    YIELD labelsOrTypes, properties
    RETURN labelsOrTypes, properties
  `);

  const required = [
    { label: 'SLIDE', property: 'id' },
    { label: 'SLIDE', property: 'object_id' },
    { label: 'STORYPOINT', property: 'id' }
  ];

  const existing = indexesResult.records
    .map(r => {
      const labels = r.get('labelsOrTypes');
      const props  = r.get('properties');
      if (!labels?.length || !props?.length) return null;
      return { label: labels[0], property: props[0] };
    })
    .filter(Boolean);

  const missing = required.filter(req =>
    !existing.some(e => e.label === req.label && e.property === req.property)
  );

  if (missing.length) {
    console.warn('Missing indexes:', missing.map(m => `${m.label}.${m.property}`).join(', '));
  }

  await session.run(`
    MATCH (n)
    WHERE n.x IS NULL OR n.y IS NULL
    SET n.x = 0, n.y = 0
  `);

  return {
    body: { success: true, missingIndexes: missing }
  };
});
