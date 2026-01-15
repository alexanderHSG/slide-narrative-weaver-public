import { useAppRefs } from "./useAppRefs";
import { useSelectionState } from "./useSelectionState";
import { useSessionState } from "./useSessionState";
import { useStoryData } from "./useStoryData";
import { useUIState } from "./useUIState";

export const useAppState = () => {
  const uiState = useUIState();
  const storyData = useStoryData();
  const selectionState = useSelectionState();
  const sessionState = useSessionState();
  const refs = useAppRefs();

  return {
    ...uiState,
    ...storyData,
    ...selectionState,
    ...sessionState,
    ...refs,
  };
};
