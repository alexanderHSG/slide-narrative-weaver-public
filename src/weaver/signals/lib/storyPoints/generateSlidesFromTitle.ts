import { ActionTypes, InteractionTypes, logger } from '@/weaver/toolkit/utils/logger/logger'
import { callGenerateSlides } from '../api/apiClient'

export const generateSlidesFromTitle = async (
  title: string,
  storypointCount: number = 1,
  refinementPrompt: string = '',
  outcome: string = ''
): Promise<{
  slideContent: Record<string, string>
  storyPointsMap: Record<string, string>
}> => {
  await logger.logInteraction(ActionTypes.STORY, {
    interaction_type: InteractionTypes.SLIDE_GENERATE,
    component: 'SlideGenerator',
    input_data: {
      title,
      outcome,
      storypointCount,
      hasGuidance: !!refinementPrompt
    }
  });


  try {
    const { slideContent, storyPointsMap } = await callGenerateSlides({
      title,
      slideCount: storypointCount,
      refinementPrompt,
      outcome
    })
    
    return { slideContent, storyPointsMap }

  } catch (error: any) {
    console.error('Error generating slides from title:', error)

    await logger.logInteraction(ActionTypes.STORY, {
      interaction_type: InteractionTypes.SLIDE_GENERATE,
      component: 'SlideGenerator',
      input_data: {
        title,
        outcome,
        storypointCount: 0,
        hasGuidance: !!refinementPrompt,
        error: String(error?.message || error)
      },
      metadata: { unit: 'storypoint', status: 'error' }
    })
    const slideFallback: Record<string, string> = {}
    const spFallback: Record<string, string> = {}
    for (let i = 1; i <= storypointCount; i++) {
      slideFallback[`slide${i}Content`] = `Content for slide ${i} about ${title}`
      spFallback[`Storypoint ${i}`] = `${title} — point ${i}`
    }
    return { slideContent: slideFallback, storyPointsMap: spFallback }
  }
}
