import { withNeo4j } from '../_shared/withNeo4j'

export const handler = withNeo4j(async ({ event, session }) => {
  const { storyPointId, description, shortTitle, slideCount } = JSON.parse(event.body || '{}')

  await session.run(
    `
    MERGE (sp:STORYPOINT { id: $id })
    ON CREATE SET
      sp.createdAt   = datetime(),
      sp.description = $description,
      sp.shortTitle  = $shortTitle,
      sp.slideCount  = $slideCount
    ON MATCH SET
      sp.description = $description,
      sp.shortTitle  = $shortTitle,
      sp.slideCount  = $slideCount,
      sp.updatedAt   = datetime()
    `,
    {
      id: storyPointId,
      description,
      shortTitle,
      slideCount: Number(slideCount) || 0
    }
  )

  return { body: { success: true } }
});
