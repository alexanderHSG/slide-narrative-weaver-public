import { useEffect, useRef } from 'react';

export function useGraphPersistence({
  storyPoints,
  setStoryPoints,
  setSelectedNodes,
  nodePositions,
  setNodePositions,
  keys = {
    storyPointsSnapshot: 'storyPointsSnapshot',
    nodePositions: 'nodePositions',
    selectedSlides: 'selectedSlides',
  },
}) {

  useEffect(() => {
    try {
      const raw = localStorage.getItem(keys.nodePositions);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') setNodePositions?.(parsed);
      }
    } catch {}
  }, [keys.nodePositions]);

  useEffect(() => {
    try {
      localStorage.setItem(keys.nodePositions, JSON.stringify(nodePositions));
    } catch {}
  }, [nodePositions, keys.nodePositions]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(keys.selectedSlides);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setSelectedNodes?.(new Set(arr));
      }
    } catch {}
  }, [keys.selectedSlides]);
}
