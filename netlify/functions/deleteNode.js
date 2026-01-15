import 'dotenv/config'
import { withNeo4j } from '../_shared/withNeo4j'

export const handler = withNeo4j(async ({ event, session }) => {
  const { nodeId, group } = JSON.parse(event.body || '{}');
  if (group === 'storypoint') {
    await session.run(
      `MATCH (sp:STORYPOINT {id:$nodeId})
      OPTIONAL MATCH (sp)<-[r]-(s:SLIDE)
      DETACH DELETE sp,s`,
      { nodeId }
    );
  } else if (group === 'slide') {
    await session.run(
      `MATCH (s:SLIDE {id:$nodeId}) DETACH DELETE s`,
      { nodeId }
    );
  }
  return { body: { success: true } };
});