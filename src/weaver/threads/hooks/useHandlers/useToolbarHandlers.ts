import { useCallback } from 'react';
import { callAddEdge, callDeleteNode, callDeleteSlides } from '@/weaver/signals/lib/api/apiClient';

const removeNodePositionsFromStorage = (nodeIds: string[]) => {
  if (!Array.isArray(nodeIds) || nodeIds.length === 0) return;
  try {
    const positions = JSON.parse(localStorage.getItem('nodePositions') || '{}');
    let changed = false;
    nodeIds.forEach(id => {
      if (positions[id]) {
        delete positions[id];
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem('nodePositions', JSON.stringify(positions));
    }
  } catch (e) {
    console.error("Failed to remove node positions from storage", e);
  }
};

type Params = {
  selectedNodes: Set<string>;
  lockedNodes: Set<string>;
  setLockedNodes: React.Dispatch<React.SetStateAction<Set<string>>>;
  handleLockNodesChange: (nodes: Set<string>) => void;
  sharedNetworkRef: React.MutableRefObject<any>;
  setStoryPoints: React.Dispatch<React.SetStateAction<any[]>>;
  storyPoints: any[];
  setSelectedNodes: (nodes: Set<string>) => void;
  setSelectedSlidesSet?: (slides: Set<string>) => void;
  setShowInitialContainers: (v: boolean) => void;
  addToHistory: (action: any) => void;
  confirm?: (options: { title: string; description: string; confirmLabel?: string; }) => Promise<boolean>;
  alert?: (options: { title: string; description: string; }) => Promise<void>;
};

export const useToolbarHandlers = ({
  selectedNodes,
  lockedNodes,
  setLockedNodes,
  handleLockNodesChange,
  sharedNetworkRef,
  setStoryPoints,
  storyPoints,
  setSelectedNodes,
  setSelectedSlidesSet,
  setShowInitialContainers,
  confirm,
  alert,
}: Params) => {
  const onLockNodes = useCallback(async (): Promise<string[]> => {
    const newlyLocked: string[] = [];
    setLockedNodes(prevLocked => {
      const newLocked = new Set(prevLocked);
      selectedNodes.forEach(id => {
        const node = sharedNetworkRef.current?.body?.data?.nodes.get(id);
        if (node?.group === 'slide') {
          newLocked.add(id);
          newlyLocked.push(id);
          sharedNetworkRef.current.body.data.nodes.update({ ...node, locked: true, label: '🔒' });
        }
      });
      handleLockNodesChange(newLocked);
      sharedNetworkRef.current?.redraw();
      return newLocked;
    });
    return newlyLocked;
  }, [selectedNodes, handleLockNodesChange, sharedNetworkRef, setLockedNodes]);

  const onUnlockNodes = useCallback(async (): Promise<string[]> => {
    const newlyUnlocked: string[] = [];
    setLockedNodes(prevLocked => {
      const newLocked = new Set(prevLocked);
      selectedNodes.forEach(id => {
        const node = sharedNetworkRef.current?.body?.data?.nodes.get(id);
        if (node?.group === 'slide') {
          newLocked.delete(id);
          newlyUnlocked.push(id);
          sharedNetworkRef.current.body.data.nodes.update({ ...node, locked: false, label: '' });
        }
      });
      handleLockNodesChange(newLocked);
      sharedNetworkRef.current?.redraw();
      return newLocked;
    });
    return newlyUnlocked;
  }, [selectedNodes, handleLockNodesChange, sharedNetworkRef, setLockedNodes]);

  const onDeleteEdge = useCallback(() => {
    sharedNetworkRef.current?.setOptions({
      manipulation: { enabled: true, initiallyActive: true, deleteEdge: true },
    });
  }, [sharedNetworkRef]);

  const onAddEdge = useCallback(() => {
    sharedNetworkRef.current?.setOptions({
      manipulation: {
        enabled: true,
        addEdge: async (edgeData: any, callback: any) => {
          const nodes = sharedNetworkRef.current.body.data.nodes;
          const fromNode = nodes.get(edgeData.from);
          const toNode = nodes.get(edgeData.to);
          if (fromNode?.group === 'storypoint' && toNode?.group === 'storypoint') {
            try {
              await callAddEdge(edgeData.from, edgeData.to);
              callback({
                id: `edge_${edgeData.from}_${edgeData.to}`, from: edgeData.from, to: edgeData.to,
                arrows: { to: { enabled: true, type: 'arrow' } },
                color: { color: '#2E7D32', highlight: '#1B5E20', hover: '#1B5E20' },
                width: 2, smooth: { enabled: true, type: 'curvedCW', roundness: 0.2 },
                chosen: true, font: { size: 12, color: '#2E7D32', strokeWidth: 0 },
              });
              sharedNetworkRef.current.redraw();
              sharedNetworkRef.current.fit();
            } catch (err) {
              console.error('API addEdge failed', err);
              callback(null);
            }
          } else {
            callback(null);
          }
        },
      },
    });
    sharedNetworkRef.current?.addEdgeMode();
  }, [sharedNetworkRef]);

  const onDeleteNode = useCallback(async () => {
    const selectedIds: string[] = sharedNetworkRef.current?.getSelectedNodes()?.filter((id: any) => {
      const node = sharedNetworkRef.current.body.data.nodes.get(id);
      return node?.group === 'storypoint';
    }) || [];

    if (!selectedIds.length) {
      await alert?.({ title: 'No Selection', description: 'Please select a Story Point to delete first.' });
      return;
    }

    if (selectedIds.some(id => {
      const node = sharedNetworkRef.current.body.data.nodes.get(id);
      return node.group === 'storypoint' && sharedNetworkRef.current.body.data.nodes.get().some((n: any) => n.parentId === id && lockedNodes.has(n.id));
    })) {
      await alert?.({ title: 'Operation Blocked', description: 'Cannot delete Story Points containing locked slides.' });
      return;
    }

    const wasConfirmed = await confirm?.({
      title: 'Confirm Deletion',
      description: `Are you sure you want to delete the selected ${selectedIds.length} Story Point(s) and all their slides?`,
      confirmLabel: 'Delete',
    });
    if (!wasConfirmed) return;

    const originalStoryPoints = storyPoints;
    const originalNodePositions = localStorage.getItem('nodePositions');
    const network = sharedNetworkRef.current;
    if (!network) return;

    const nodesDS = network.body.data.nodes;
    const edgesDS = network.body.data.edges;

    const storyPointsToRemove = new Set<string>(selectedIds);
    const slidesToRemove = new Set<string>();
    const allNodeIdsToRemove = new Set<string>(selectedIds);

    selectedIds.forEach(id => {
      nodesDS.get({ filter: (n: any) => n.parentId === id }).forEach((child: any) => {
        allNodeIdsToRemove.add(child.id);
        slidesToRemove.add(child.id);
      });
    });

    const finalIdsToRemove = Array.from(allNodeIdsToRemove);

    removeNodePositionsFromStorage(finalIdsToRemove);
    nodesDS.remove(finalIdsToRemove);
    const edgesToRemove = edgesDS.get({ filter: (edge: any) => finalIdsToRemove.includes(edge.from) || finalIdsToRemove.includes(edge.to) }).map((edge: any) => edge.id);
    edgesDS.remove(edgesToRemove);
    setStoryPoints(sp => sp.filter(p => !storyPointsToRemove.has(p.id)));
    setSelectedSlidesSet?.(new Set());
    setSelectedNodes(new Set());
    if (!nodesDS.get().some((n: any) => n.group === 'storypoint')) {
      setShowInitialContainers(true);
    }

    const apiPromises: Promise<any>[] = [];
    const slideIdsToApi = Array.from(slidesToRemove).map(id => id.includes('_') ? id.split('_')[1] : id);

    if (slideIdsToApi.length > 0) {
      apiPromises.push(callDeleteSlides(slideIdsToApi));
    }
    storyPointsToRemove.forEach(id => {
      apiPromises.push(callDeleteNode(id));
    });

    try {
      await Promise.all(apiPromises);
    } catch (err) {
      console.error('Delete node failed, rolling back UI changes', err);
      setStoryPoints(originalStoryPoints);
      if (originalNodePositions) localStorage.setItem('nodePositions', originalNodePositions);
      await alert?.({ title: 'Error', description: 'Could not delete from the server. Your view may be out of sync. Please refresh the page.' });
    }
  }, [sharedNetworkRef, lockedNodes, storyPoints, setStoryPoints, setSelectedNodes, setSelectedSlidesSet, setShowInitialContainers, confirm, alert]);

  const onDeleteSlides = useCallback(async () => {
    const savedSelections = localStorage.getItem('selectedSlides');
    const slideIds: string[] = savedSelections ? JSON.parse(savedSelections) : [];

    if (!Array.isArray(slideIds) || slideIds.length === 0) {
      await alert?.({ title: 'No Selection', description: 'Please select the slides you want to delete first.' });
      return;
    }

    const network = sharedNetworkRef.current;
    if (!network) return;

    const nodesDS = network.body?.data?.nodes;
    const edgesDS = network.body?.data?.edges;

    const onCanvasVisIds: string[] = [];
    const offCanvasVisIds: string[] = [];
    for (const id of slideIds) {
      const n = nodesDS?.get?.(id);
      if (n && n.group === 'slide') onCanvasVisIds.push(id);
      else offCanvasVisIds.push(id);
    }

    const lockedInSelection = slideIds.filter(id => lockedNodes.has(id));
    if (lockedInSelection.length > 0) {
      await alert?.({ title: 'Operation Blocked', description: `Cannot delete ${lockedInSelection.length} locked slide(s).` });
      return;
    }

    if ((onCanvasVisIds.length + offCanvasVisIds.length) === 0) {
      await alert?.({ title: 'No Selection', description: 'Please select the slides you want to delete first.' });
      return;
    }

    const total = onCanvasVisIds.length + offCanvasVisIds.length;
    const wasConfirmed = await confirm?.({
      title: 'Confirm Deletion',
      description: `Are you sure you want to delete the selected ${total} slide(s)?`,
      confirmLabel: 'Delete',
    });
    if (!wasConfirmed) return;

    const originalStoryPoints = storyPoints;
    const originalNodePositions = localStorage.getItem('nodePositions');

    removeNodePositionsFromStorage([...onCanvasVisIds, ...offCanvasVisIds]);

    setStoryPoints(prev =>
      prev.map(sp => ({
        ...sp,
        slides: sp.slides?.filter((sl: any) => {
          const visId = `${sp.id}_${sl.id}`;
          return !onCanvasVisIds.includes(visId) &&
                !offCanvasVisIds.includes(visId) &&
                !onCanvasVisIds.includes(sl.id) &&
                !offCanvasVisIds.includes(sl.id);
        }),
      }))
    );

    if (onCanvasVisIds.length) {
      try {
        nodesDS.remove(onCanvasVisIds);
      } catch {}
      try {
        const edgesToRemove = edgesDS
          .get({ filter: (e: any) => onCanvasVisIds.includes(e.from) || onCanvasVisIds.includes(e.to) })
          .map((e: any) => e.id);
        if (edgesToRemove.length) edgesDS.remove(edgesToRemove);
      } catch {}
    }

    setSelectedSlidesSet?.(new Set());
    setSelectedNodes(new Set());
    try {
      const lsSel: string[] = JSON.parse(localStorage.getItem('selectedSlides') || '[]');
      const lsOrd: string[] = JSON.parse(localStorage.getItem('selectedSlidesOrder') || '[]');
      const toDeleteSet = new Set([...onCanvasVisIds, ...offCanvasVisIds]);
      const nextSel = (Array.isArray(lsSel) ? lsSel : []).filter(id => !toDeleteSet.has(id));
      const nextOrd = (Array.isArray(lsOrd) ? lsOrd : []).filter(id => !toDeleteSet.has(id));
      localStorage.setItem('selectedSlides', JSON.stringify(nextSel));
      localStorage.setItem('selectedSlidesOrder', JSON.stringify(nextOrd));
    } catch {}
    try { network.unselectAll?.(); } catch {}
    try { network.redraw?.(); } catch {}

    const allVisIds = [...onCanvasVisIds, ...offCanvasVisIds];
    const idsToApi = allVisIds.map(visId => visId.includes('_') ? visId.split('_')[1] : visId);

    try {
      await callDeleteSlides(idsToApi);
    } catch (err) {
      console.error('API callDeleteSlides failed, rolling back UI changes', err);

      setStoryPoints(originalStoryPoints);

      if (originalNodePositions) {
        localStorage.setItem('nodePositions', originalNodePositions);
      }
      
      await alert?.({ 
        title: 'Error', 
        description: 'Could not delete slides from the server. Your view may be out of sync. Please refresh the page.' 
      });
    }
  }, [sharedNetworkRef, lockedNodes, storyPoints, setStoryPoints, setSelectedNodes, setSelectedSlidesSet, confirm, alert]);


  return {
    onLockNodes,
    onUnlockNodes,
    onAddEdge,
    onDeleteEdge,
    onDeleteNode,
    onDeleteSlides,
  };
};
