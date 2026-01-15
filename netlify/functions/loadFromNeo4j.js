import { withNeo4j } from '../_shared/withNeo4j'
import { loadSlides } from './loadSlides.js'

export const handler = withNeo4j(async ({ event, session }) => {
  const { description, limit, guidancePrompt, searchType } = JSON.parse(event.body || '{}');

  const slides = await loadSlides(
    { description, limit, guidancePrompt, searchType },
    session
  );

  return {
    body: { slides }
  };
});
