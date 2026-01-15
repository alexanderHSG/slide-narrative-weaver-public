import { useEffect } from 'react';

export const useSyncNetworkWithStoryPoints = (
  sharedNetworkRef: React.RefObject<any>,
  storyPoints: any[],
  setStoryPoints: (points: any[]) => void,
  setSelectedNodes: (nodes: Set<string>) => void,
  syncNetworkWithState: Function,
  setupSlidePersistence: Function
) => {
  useEffect(() => {
    if (sharedNetworkRef?.current && storyPoints.length > 0) {
      syncNetworkWithState(sharedNetworkRef, storyPoints);

      const cleanup = setupSlidePersistence(
        sharedNetworkRef,
        storyPoints,
        setStoryPoints,
        setSelectedNodes
      );

      return cleanup;
    }
  }, [sharedNetworkRef, storyPoints, setStoryPoints, setSelectedNodes]);
};
