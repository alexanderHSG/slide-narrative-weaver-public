import { ActionTypes, InteractionStatus, InteractionTypes } from '@/weaver/toolkit/utils/logger/logger'
import { generateSlidesFromTitle } from './generateSlidesFromTitle'
import { generateShortTitleFromDescription } from './generateShortTitleFromDescription'
import {
  callEmbeddings,
  callFetchSimilarSlides
} from '../api/apiClient';

export type Slide = {
  id: string
  originalId?: string
  content?: string
  visible?: boolean
  object_id?: string
  percentage?: number
  similarity?: number
  locked?: boolean
}

export type StoryPoint = {
  id: string
  type: string
  description: string
  created: string
  slide1Content: string
  slide2Content: string
  slide3Content: string
  slides: Slide[]
  shortTitle: string
}

type FormData = {
  topic?: string
  description?: string
  goals?: string
  outcome?: string
  guidancePrompt?: string
  numPoints?: number
  appendToExisting?: boolean
  selectedPointId?: string
  insertPosition?: 'before'|'after'
}

type HandleFormSubmitArgs = {
  formData: FormData
  logger: any
  setStoryPoints: React.Dispatch<React.SetStateAction<StoryPoint[]>>
  setShowInitialContainers: (val: boolean) => void
  sharedNetworkRef: React.MutableRefObject<any>
  setLoading?: (val: boolean) => void
  onClearSelection?: () => void
}

declare global {
  interface Window {
    resetUsedSlideIds: () => void
  }
}

const formatScore = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return Number(value.toFixed(3))
}

export const handleFormSubmit = async ({
  formData,
  logger,
  setStoryPoints,
  setShowInitialContainers,
  sharedNetworkRef,
  setLoading,
  onClearSelection
}: HandleFormSubmitArgs): Promise<boolean> => {
  try {
    setLoading?.(true)

    const description = formData.topic
      ?? formData.description
      ?? formData.goals
      ?? ''
    const guidance = formData.guidancePrompt ?? ''
    const outcome = formData.outcome ?? ''

    if (!description) {
      console.error('[DEBUG] No description provided in form data.');
      return false
    }

    const numPoints = Number(formData.numPoints ?? 1)

    if (typeof window.resetUsedSlideIds === 'function') {
      window.resetUsedSlideIds()
    }

    const {
      slideContent: generatedSlideContent,
      storyPointsMap
    } = await generateSlidesFromTitle(
      description, numPoints, guidance, outcome
    )

    const searchText = guidance.length
      ? `${description} ${guidance}`
      : description

    const { embedding } : any = await callEmbeddings(searchText)
    const matchingSlides = await callFetchSimilarSlides(
      embedding,
      numPoints * 3
    )

    const newSPs: StoryPoint[] = []
    const pointDescs: string[] = []
    for (let i = 1; i <= numPoints; i++) {
      pointDescs.push(storyPointsMap[`Storypoint ${i}`] ?? description)
    }
    const shortTitles = await Promise.all(
      pointDescs.map(d => generateShortTitleFromDescription(String(d)))
    )

    type StoryPointLogEntry = {
      sp_id: string
      sp_description: string
      num_locked_slides: number
      num_slides_retrieved: number
      retrieved_slides: Array<{ id: string | null; score: number | null }>
    }

    const storyPointsLogData: StoryPointLogEntry[] = []

    for (let i = 0; i < numPoints; i++) {
      const id = `sp_${Date.now()}_${i}`
      const start = i * 3
      const end = start + 3
      const slice = matchingSlides.slice(start, end)
      
      const retrievedSlidesLogData = slice.map((slide: any) => {
        const resolvedId = slide.originalId ?? slide.id
        return {
          id: resolvedId ? String(resolvedId) : null,
          score: formatScore(slide.similarity)
        }
      })

      storyPointsLogData.push({
        sp_id: id,
        sp_description: pointDescs[i],
        num_locked_slides: 0,
        num_slides_retrieved: slice.length,
        retrieved_slides: retrievedSlidesLogData
      })
      
      const slides: Slide[] = slice.map((s: any, idx: any) => ({
        ...s,
        id: `${s.id}_sp_${i}_${idx}_${Date.now()}`,
        originalId: s.id,
        visible: true,
        locked: false
      }))

      newSPs.push({
        id,
        type: 'concept',
        description: pointDescs[i],
        shortTitle: shortTitles[i],
        created: new Date().toISOString(),
        slide1Content: generatedSlideContent.slide1Content ?? '',
        slide2Content: generatedSlideContent.slide2Content ?? '',
        slide3Content: generatedSlideContent.slide3Content ?? '',
        slides
      })
    }
    try {
      await logger.logInteraction(ActionTypes.STORY, {
        component: 'CreateForm',
        interaction_type: InteractionTypes.STORY_CREATE,
        status: InteractionStatus.SUCCESS,
        input_data: {
          action_type: 'create_story_points',
          topic: formData.topic,
          expected_outcome: outcome,
          num_points: numPoints,        },
        output_data: {
          created_story_points: storyPointsLogData
        }
      })
    } catch (err) {
      console.error('Error in logging block!', err);
    }

    setStoryPoints(prev => {
      let updated: StoryPoint[]
      if (formData.appendToExisting && prev.length > 0) {
        if (formData.selectedPointId) {
          const idx = prev.findIndex(p => p.id === formData.selectedPointId)
          if (idx !== -1) {
            const ins = formData.insertPosition === 'before'
              ? idx
              : idx + 1
            updated = [
              ...prev.slice(0, ins),
              ...newSPs,
              ...prev.slice(ins)
            ]
          } else {
            updated = [...prev, ...newSPs]
          }
        } else {
          updated = [...prev, ...newSPs]
        }
      } else {
        updated = newSPs
        try {
          sharedNetworkRef.current?.unselectAll?.()
        } catch {}
        onClearSelection?.()
        try { localStorage.removeItem('selectedSlides') } catch {}
      }

      if (sharedNetworkRef.current) {
        sharedNetworkRef.current.destroy()
        sharedNetworkRef.current = null
      }
      
      return updated
    })

    setShowInitialContainers(false)
    return true

  } catch (err) {
    console.error('Error in `handleFormSubmit`!', err);
    return false

  } finally {
    setLoading?.(false)
  }
}