import { useStoryPointEditDialog } from "./useStoryPointEditDialog";

export const useStoryPointDialogHandlers = ({
  storyPoints,
  setStoryPoints,
  setEditingStoryPoint,
  addToHistory,
  sharedNetworkRef,
  lockedNodes,
  driver,
}) => {
  return useStoryPointEditDialog({
    storyPoints,
    setStoryPoints,
    setEditingStoryPoint,
    addToHistory,
    sharedNetworkRef,
    lockedNodes,
    driver,
  });
};
