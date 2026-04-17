import { withNeo4j } from '../_shared/withNeo4j'

export const handler = withNeo4j(async ({ event, session }) => {
  const { storyPointId } = event.queryStringParameters || {};
  const result = await session.run(
    `MATCH (sp:STORYPOINT {id: $id}) RETURN count(sp) AS cnt`,
    { id: storyPointId }
  );
  const exists = (result.records[0]?.get('cnt')?.toNumber?.() ?? 0) > 0;
  return { body: { exists } };
});
