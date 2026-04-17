import 'dotenv/config';
import { withNeo4j } from '../_shared/withNeo4j';

export const handler = withNeo4j(async ({ event, session }) => {
  const { slideIds = [] } = JSON.parse(event.body || '{}');

  if (slideIds.length === 0) {
    return { body: { success: true, message: 'No slides to delete.' } };
  }

  await session.run(
    `MATCH (s:SLIDE) WHERE s.id IN $slideIds DETACH DELETE s`,
    { slideIds }
  );

  return { body: { success: true } };
});