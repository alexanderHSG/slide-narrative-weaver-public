import { withNeo4j } from '../_shared/withNeo4j'

export const handler = withNeo4j(async ({ event, session }) => {
  const { slideId } = event.queryStringParameters || {};
  const result = await session.run(
    `MATCH (s:SLIDE {id: $id}) RETURN count(s) AS cnt`,
    { id: slideId }
  );
  const exists = (result.records[0]?.get('cnt')?.toNumber?.() ?? 0) > 0;
  return { body: { exists } };
});
