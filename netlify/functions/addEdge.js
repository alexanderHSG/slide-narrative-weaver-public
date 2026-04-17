import 'dotenv/config'
import { withNeo4j } from '../_shared/withNeo4j'

export const handler = withNeo4j(async ({ event, session }) => {
   const { fromId, toId } = JSON.parse(event.body || '{}');
   await session.run(
     `MATCH (a:STORYPOINT {id:$fromId}), (b:STORYPOINT {id:$toId})
      MERGE (a)-[:FOLLOWS]->(b)`,
     { fromId, toId }
   );
   return { body: { success: true } };
 });
