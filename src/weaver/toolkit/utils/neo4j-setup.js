import {
  callMarkSlidesOnCanvas,
  callSetupNeo4jSchema,
  callFindSlideReference,
  callFindStoryPointReference
} from '@/weaver/signals/lib/api/apiClient';

export async function markSlidesOnCanvas(networkRef) {
  if (!networkRef?.current) return

  const allNodes = networkRef.current.body.data.nodes.get()
  const slideIds = allNodes
    .filter(n => n.group === 'slide')
    .map(n => {
      if (typeof n.id !== 'string') return null
      return n.id.includes('_') ? n.id.split('_')[1] : n.id
    })
    .filter(id => !!id && !id.startsWith('slide'))

  if (slideIds.length === 0) {
    console.warn('No slide nodes on canvas found')
    return
  }

  try {
    await callMarkSlidesOnCanvas(slideIds)
  } catch (err) {
    console.error('Error marking slides on canvas:', err)
  }
}

export async function setupNeo4jSchema() {
  try {
    const { success, missingIndexes } = await callSetupNeo4jSchema()
    if (Array.isArray(missingIndexes) && missingIndexes.length) {
      console.warn('Missing indexes:', missingIndexes.join(', '))
    }
    return success
  } catch (err) {
    console.error('Error checking Neo4j schema:', err)
    throw err
  }
}

export async function findSlideReference(slideId) {
  try {
    return await callFindSlideReference(slideId)
  } catch (err) {
    console.error('Error finding slide reference:', err)
    return false
  }
}

export async function findStoryPointReference(storyPointId) {
  try {
    return await callFindStoryPointReference(storyPointId)
  } catch (err) {
    console.error('Error finding story point reference:', err)
    return false
  }
}
