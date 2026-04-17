import Toolbar from '../Toolbar/Toolbar';

const ActiveMenuPanel = ({
  activeMenu,
  activeTool,
  setActiveTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  selectedNodes,
  onLockNodes,
  onUnlockNodes,
  onClearAll,
  storyPoints,
  networkRef,
  lockedNodes,
  onDeleteNode,
  onDeleteSlides,
  setSelectedNodes,
  setStoryPoints,
  driver,
  settings,
  onSettingsChange,
  onCloseViewPanel,
  nodesRef,
  layoutMode,
  setLayoutMode,
  nodePositions,
  setNodePositions,
}) => {

  switch (activeMenu) {
    case 'board':
      return (
        <Toolbar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={onUndo}
          onRedo={onRedo}
          selectedNodes={selectedNodes}
          onLockNodes={onLockNodes}
          onUnlockNodes={onUnlockNodes}
          onClearAll={onClearAll}
          onDeleteNode={onDeleteNode}
          onDeleteSlides={onDeleteSlides}
          networkRef={networkRef}
          setSelectedNodes={setSelectedNodes}
          storyPoints={storyPoints}
          setStoryPoints={setStoryPoints}
          driver={driver}
          lockedNodes={lockedNodes}
          nodesRef={nodesRef}
          layoutMode={layoutMode}
          setLayoutMode={setLayoutMode}
          nodePositions={nodePositions}
          setNodePositions={setNodePositions}
        />
      );

    default:
      return null;
  }
};

export default ActiveMenuPanel;
