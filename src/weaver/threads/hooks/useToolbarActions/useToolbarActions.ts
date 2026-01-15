import { useToolbarHandlers } from '../useHandlers/useToolbarHandlers.ts';
import { useClearActions } from './useClearActions.ts';

export const useToolbarActions = ({
  sharedNetworkRef,
  selectedNodes,
  lockedNodes,
  setLockedNodes,
  setShowInitialContainers,
  setStoryPoints,
  setSelectedNodes,
  setSelectedSlidesSet,
  handleLockNodesChange,
  addToHistory,
  storyPoints,
  driver,
  confirm,
  alert,
}) => {
  const {
    onLockNodes,
    onUnlockNodes,
    onAddEdge,
    onDeleteEdge,
    onDeleteNode,
    onDeleteSlides,
  } = useToolbarHandlers({
    sharedNetworkRef,
    selectedNodes,
    lockedNodes,
    setLockedNodes,
    setShowInitialContainers,
    setStoryPoints,
    setSelectedNodes,
    setSelectedSlidesSet,
    handleLockNodesChange,
    addToHistory,
    storyPoints,
    driver,
    confirm,
    alert,
  });

  const { handleClearAll } = useClearActions({
    setStoryPoints,
    setLockedNodes,
    setSelectedNodes,
    setSelectedSlidesSet,
    setShowInitialContainers,
    sharedNetworkRef,
    confirm,
  });

  return {
    onLockNodes,
    onUnlockNodes,
    onAddEdge,
    onDeleteEdge,
    onDeleteNode,
    onDeleteSlides,
    handleClearAll,
  };
};