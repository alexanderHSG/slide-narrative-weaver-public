import { useState, useCallback } from 'react';

export function useSelectionState() {

  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());

  const [lockedNodes, setLockedNodes] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('lockedNodes');
    return saved ? new Set<string>(JSON.parse(saved)) : new Set();
  });

  const [selectedNodeInfo, setSelectedNodeInfo] = useState<any>(null);

  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const [selectedSlidesSet, setSelectedSlidesSet] = useState<Set<string>>(new Set());

  const toggleLockNode = useCallback(
    (nodeId: string) =>
      setLockedNodes(prev => {
        const next = new Set(prev);
        next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
        localStorage.setItem('lockedNodes', JSON.stringify(Array.from(next)));
        return next;
      }),
    []
  );

  return {
    selectedNodes,
    setSelectedNodes,
    lockedNodes,
    setLockedNodes,
    selectedNodeInfo,
    setSelectedNodeInfo,
    mousePosition,
    setMousePosition,
    selectedSlidesSet,
    setSelectedSlidesSet,
    toggleLockNode,
  } as const;
}
