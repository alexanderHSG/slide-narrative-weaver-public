import { useState, useCallback } from 'react';

export function useHistoryManager(sharedNetworkRef, setStoryPoints) {

  const [history, setHistory] = useState<any[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const addToHistory = useCallback(points => {
    const newHistory = [
      ...history.slice(0, historyIndex + 1),
      JSON.parse(JSON.stringify(points)),
    ];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCanUndo(true);
    setCanRedo(false);

    if (sharedNetworkRef.current) {
      const nodes = sharedNetworkRef.current.body.data.nodes;
      points.forEach(point => {
        nodes.update(point);
      });
    }
  }, [history, historyIndex, sharedNetworkRef]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousState = JSON.parse(JSON.stringify(history[newIndex]));
      setStoryPoints(previousState);
      setHistoryIndex(newIndex);
      setCanRedo(true);

      if (sharedNetworkRef.current) {
        const nodes = sharedNetworkRef.current.body.data.nodes;
        const edges = sharedNetworkRef.current.body.data.edges;
        nodes.clear();
        edges.clear();
        previousState.forEach(point => {
          nodes.update(point);
          if (point.edges) {
            point.edges.forEach(edge => edges.update(edge));
          }
        });
        sharedNetworkRef.current.redraw();
      }
      if (newIndex === 0) setCanUndo(false);
    }
  }, [history, historyIndex, sharedNetworkRef, setStoryPoints]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextState = JSON.parse(JSON.stringify(history[newIndex]));
      setStoryPoints(nextState);
      setHistoryIndex(newIndex);
      setCanUndo(true);

      if (sharedNetworkRef.current) {
        const nodes = sharedNetworkRef.current.body.data.nodes;
        const edges = sharedNetworkRef.current.body.data.edges;
        nodes.clear();
        edges.clear();
        nextState.forEach(point => {
          nodes.update(point);
          if (point.edges) {
            point.edges.forEach(edge => edges.update(edge));
          }
        });
        sharedNetworkRef.current.redraw();
      }
      if (newIndex === history.length - 1) setCanRedo(false);
    }
  }, [history, historyIndex, sharedNetworkRef, setStoryPoints]);

  return {
    addToHistory,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
  };
}