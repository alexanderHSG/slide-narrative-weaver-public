import Joyride from 'react-joyride';

import TopNav from '../TopNav/TopNav';
import ActiveMenuPanel from '../ActiveMenuPanel/ActiveMenuPanel';
import RightSidebar from '../RightSidebar/RightSidebar';
import ContentArea from '../ContentArea/ContentArea';
import ExportDialog from '../ExportDialog/ExportDialog';
import PreviewModal from '../PreviewModal/PreviewModal';
import StoryPointEditDialog from '../StoryPointEditDialog/StoryPointEditDialog';
import ActiveToolPanel from '../ActiveToolPanel/ActiveToolPanel';
import PrototypeCView from '../PrototypeCView/PrototypeCView';

import { enhanceDescription } from '@/weaver/toolkit/utils/enhanceDescription';
import { handleExport } from '@/weaver/signals/lib/export/handleExport';
import { getBase64Image } from '@/weaver/signals/lib/export/getBase64Image';
import { useUser } from '../UserAccessWrapper/UserAccessWrapper';

const MainLayout = ({
  runTour,
  tourSteps,
  handleTourCallback,
  toggleExportDialog,
  selectedNodes,
  activeMenu,
  activeTool,
  setActiveTool,
  canUndo,
  canRedo,
  handleUndo,
  handleRedo,
  setLockedNodes,
  onLockNodes,
  onUnlockNodes,
  onClearAll,
  onGetNextSlides,
  sharedNetworkRef,
  lockedNodes,
  onAddEdge,
  onDeleteEdge,
  onDeleteNode,
  onDeleteSlides,
  setShowPreview,
  setSelectedNodes,
  setStoryPoints,
  viewSettings,
  setViewSettings,
  setActiveMenu,
  loading,
  storyPoints,
  handleNodeEdit,
  setEditingStoryPoint,
  editingStoryPoint,
  mousePosition,
  setMousePosition,
  selectedNodeInfo,
  setSelectedNodeInfo,
  handleFormSubmit,
  logger,
  generateSlidesFromTitle,
  loadFromNeo4j,
  driver,
  isFormOpen,
  setIsFormOpen,
  showExportDialog,
  showPreview,
  handleSave,
  handleRegenerate,
  showImages,
  selectedSlidesSet,
  setSelectedSlidesSet,
  toggleLockNode,
  handleSaveStoryPoint,
  pdfProcessorRef,
  interactionTrackerRef,
  analyticsRef,
  setFilterActive,
  setLoading,
  showInitialContainers,
  setShowInitialContainers,
  layoutMode,
  setLayoutMode,
  nodePositions,
  setNodePositions,
  setShouldOpenGraphTutorial,
}) => {
  const { isExp, prototype } = useUser?.() || {};
  const isC1 = isExp && prototype === 'C1';
  const isC2 = isExp && prototype === 'C2';

  if (isC1) return <PrototypeCView variant="C1" />;
  if (isC2) return <PrototypeCView variant="C2" />;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        showProgress
        showSkipButton
        callback={handleTourCallback}
        styles={{
          options: {
            primaryColor: '#15803d',
            backgroundColor: '#ffffff',
            textColor: '#1f2937',
            arrowColor: '#ffffff',
            overlayColor: 'rgba(0, 0, 0, 0.5)',
          },
        }}
      />

      <TopNav
        onExport={toggleExportDialog}
        selectedCount={selectedNodes.size}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        setShouldOpenGraphTutorial={setShouldOpenGraphTutorial}
      />

      <ActiveMenuPanel
        activeMenu={activeMenu}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        selectedNodes={selectedNodes}
        onLockNodes={onLockNodes}
        onUnlockNodes={onUnlockNodes}
        onClearAll={onClearAll}
        onGetNextSlides={onGetNextSlides}
        networkRef={sharedNetworkRef}
        lockedNodes={lockedNodes}
        onAddEdge={onAddEdge}
        onDeleteEdge={onDeleteEdge}
        onDeleteNode={onDeleteNode}
        onDeleteSlides={onDeleteSlides}
        setShowPreview={setShowPreview}
        setSelectedNodes={setSelectedNodes}
        setStoryPoints={setStoryPoints}
        driver={driver}
        settings={viewSettings}
        onSettingsChange={(newSettings) => {
          setViewSettings(newSettings);
          if (sharedNetworkRef.current) {
            sharedNetworkRef.current.setOptions({
              nodes: { font: { size: newSettings.showLabels ? 14 : 0 } },
            });
            if (newSettings.zoomLevel !== viewSettings.zoomLevel) {
              sharedNetworkRef.current.moveTo({
                scale: newSettings.zoomLevel,
                animation: { duration: 1000, easingFunction: 'easeInOutQuad' },
              });
            }
          }
        }}
        onCloseViewPanel={() => setActiveMenu('board')}
        layoutMode={layoutMode}
        setLayoutMode={setLayoutMode}
        nodePositions={nodePositions}
        setNodePositions={setNodePositions}
      />

      <RightSidebar
        onCreateClick={() => setIsFormOpen(true)}
        networkRef={sharedNetworkRef}
        setSelectedNodes={setSelectedNodes}
        setShowPreview={setShowPreview}
        setActiveTool={setActiveTool}
      />

      <ContentArea
        loading={loading}
        setLoading={setLoading}
        storyPoints={storyPoints}
        viewSettings={viewSettings}
        activeTool={activeTool}
        selectedNodes={selectedNodes}
        setSelectedNodes={setSelectedNodes}
        handleNodeEdit={(nodeId) => handleNodeEdit(nodeId, storyPoints, setEditingStoryPoint)}
        setEditingStoryPoint={setEditingStoryPoint}
        lockedNodes={lockedNodes}
        sharedNetworkRef={sharedNetworkRef}
        selectedNodeInfo={selectedNodeInfo}
        mousePosition={mousePosition}
        setSelectedNodeInfo={setSelectedNodeInfo}
        setMousePosition={setMousePosition}
        handleFormSubmit={handleFormSubmit}
        logger={logger}
        generateSlidesFromTitle={generateSlidesFromTitle}
        loadFromNeo4j={loadFromNeo4j}
        driver={driver}
        setStoryPoints={setStoryPoints}
        isFormOpen={isFormOpen}
        setIsFormOpen={setIsFormOpen}
        showInitialContainers={showInitialContainers}
        setShowInitialContainers={setShowInitialContainers}
        setShowPreview={setShowPreview}
        layoutMode={layoutMode}
        setLayoutMode={setLayoutMode}
        nodePositions={nodePositions}
        setNodePositions={setNodePositions}
      />

      <ExportDialog
        isOpen={showExportDialog}
        onClose={toggleExportDialog}
        selectedSlides={selectedNodes}
        isExperimental={isExp}
        storyPoints={storyPoints}
        onExport={async (format) => {
          await handleExport({
            format,
            selectedNodes,
            sharedNetworkRef,
            getBase64Image,
            logger,
            storyPoints,
          });
        }}
      />

      {editingStoryPoint && (
        <StoryPointEditDialog
          storyPoint={editingStoryPoint}
          onClose={() => setEditingStoryPoint(null)}
          networkRef={sharedNetworkRef}
          lockedNodes={lockedNodes}
          onSave={handleSave}
          onRegenerate={handleRegenerate}
          onRemoveFromSelection={(removedIds) => {
            setSelectedNodes(prev => {
              const next = new Set(prev);
              removedIds.forEach(id => next.delete(id));
              return next;
            });
          }}
        />
      )}

      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        storyPoints={storyPoints}
        setStoryPoints={setStoryPoints}
        enhanceDescription={enhanceDescription}
        showImages={showImages}
        slides={Array.from(selectedNodes)}
        onSelect={(slideId) => {
          setSelectedNodes((prev) => {
            const next = new Set(prev);
            if (next.has(slideId)) next.delete(slideId);
            else next.add(slideId);
            return next;
          });
        }}
        onLock={toggleLockNode}
        onNodeEdit={handleNodeEdit}
        onSaveStoryPoint={handleSaveStoryPoint}
        selectedSlidesSet={new Set(selectedNodes)}
        setSelectedSlidesSet={(set) => setSelectedNodes(new Set(set))}
        onRegenerate={handleRegenerate}
        sharedNetworkRef={sharedNetworkRef}
        driver={driver}
        lockedNodes={lockedNodes}
        selectedNodes={new Set(selectedNodes)}
        onLockNodes={onLockNodes}
        onUnlockNodes={onUnlockNodes}
        setLockedNodes={setLockedNodes}
        onDeleteNode={onDeleteNode}
      />

      <ActiveToolPanel
        activeTool={activeTool}
        pdfProcessorRef={pdfProcessorRef}
        interactionTrackerRef={interactionTrackerRef}
        analyticsRef={analyticsRef}
        sharedNetworkRef={sharedNetworkRef}
        setStoryPoints={setStoryPoints}
        storyPoints={storyPoints}
        setShowPreview={setShowPreview}
        driver={driver}
        setActiveTool={setActiveTool}
        setFilterActive={setFilterActive}
      />
    </div>
  );
};

export default MainLayout;
