import { RefObject } from 'react';
import type { Network } from 'vis-network';

type UseClearActionsProps = {
  sharedNetworkRef?: RefObject<Network | null>;
  setStoryPoints?: (points: any[]) => void;
  setLockedNodes?: (nodes: Set<string>) => void;
  setSelectedSlidesSet?: (slides: Set<string>) => void;
  setSelectedNodes?: (nodes: Set<string>) => void;
  setShowInitialContainers?: (val: boolean) => void;
  confirm?: (options: {
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
  }) => Promise<boolean>;
};

export function useClearActions({
  sharedNetworkRef,
  setStoryPoints,
  setLockedNodes,
  setSelectedSlidesSet,
  setSelectedNodes,
  setShowInitialContainers,
  confirm,
}: UseClearActionsProps) {
  const clearLocalStorage = () => {
    const baseKeys = [
      'storyPoints', 'storyPointsSnapshot', 'selectedSlides',
      'lockedSlides', 'nodePositions', 'hiddenNodes', 'hiddenEdges',
    ];
    baseKeys.forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
    try {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('gv:storyPoints:')) localStorage.removeItem(k);
      });
    } catch {}
  };

  const clearNetwork = () => {
    const net = sharedNetworkRef?.current;
    if (!net) return;
    try { net.setData({ nodes: [], edges: [] }); } catch {}
    try { net.destroy(); } catch {}
    try { (sharedNetworkRef as any).current = null; } catch {}
  };

  const handleClearAll = async () => {
    if (confirm) {
      const wasConfirmed = await confirm({
        title: 'Confirm Clear',
        description: 'Are you sure you want to clear the entire visualization? This action will not affect the data in the database.',
        confirmLabel: 'Clear All',
        cancelLabel: 'Cancel',
      });
      if (!wasConfirmed) return;
    } else if (!window.confirm('Are you sure you want to clear all nodes?')) {
      return;
    }

    setStoryPoints?.([]);
    setLockedNodes?.(new Set());
    setSelectedSlidesSet?.(new Set());
    setSelectedNodes?.(new Set());
    clearLocalStorage();
    clearNetwork();
    setShowInitialContainers?.(true);
  };

  return { handleClearAll };
}