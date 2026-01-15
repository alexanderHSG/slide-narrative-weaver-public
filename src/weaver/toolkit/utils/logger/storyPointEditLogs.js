import { InteractionStatus } from './logger';

export const buildManualStoryPointEditLog = ({
  interactionType,
  component,
  storyPointId,
  previousDescription,
  updatedDescription,
  updatedShortTitle,
  refinementPrompt = null,
  requestedSlideCount = 0,
  regeneratedSlides = 0,
  prototype = null,
  status = InteractionStatus.SUCCESS,
}) => ({
  interaction_type: interactionType,
  component,
  status,
  metadata: { storyPointId },
  input_data: {
    storyPointId,
    previousDescription,
    updatedDescription,
    refinementPrompt,
    requestedSlideCount,
    prototype,
  },
  output_data: {
    updatedDescription,
    updatedShortTitle,
    regeneratedSlides,
  },
});

