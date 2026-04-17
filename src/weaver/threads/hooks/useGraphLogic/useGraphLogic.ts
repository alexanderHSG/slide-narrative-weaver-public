import { useNetworkManager } from './useNetworkManager.ts';

export const useGraphLogic = ({
  sharedNetworkRef,
  setStoryPoints,
  setSelectedNodes,
  setLockedNodes,
}) => {
  return useNetworkManager({
    networkRef: sharedNetworkRef,
    storyPoints: [],
    setStoryPoints,
    setSelectedNodes,
    setLockedNodes,
  });
};
