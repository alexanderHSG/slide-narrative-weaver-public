import { callEvaluateSlides } from "@/weaver/signals/lib/api/apiClient"

export async function evaluateSlidesForStoryPoint(storyPointDescription, slides) {
  try {
    return await callEvaluateSlides(storyPointDescription, slides)
  } catch (err) {
    console.error('Error evaluating slides:', err)
    throw new Error('GPT evaluation failed')
  }
}
