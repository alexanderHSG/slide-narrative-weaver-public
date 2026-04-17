import { useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';

import GraphVisualization from '../GraphVisualization/GraphVisualization.jsx';
import InformationSteps from '../InformationSteps/InformationSteps.jsx';
import CreateForm from '../CreateForm/CreateForm.jsx';

import { ActionTypes } from '@/weaver/toolkit/utils/logger/logger.js';
import { useUser } from '../UserAccessWrapper/UserAccessWrapper';
import { InitialWithCTA } from './InitialWithCTA.jsx';

const ContentArea = ({
  loading,
  showInitialContainers,
  storyPoints = [],
  viewSettings,
  activeTool,
  selectedNodes,
  setSelectedNodes,
  handleNodeEdit,
  lockedNodes,
  setLockedNodes,
  sharedNetworkRef,
  setSelectedNodeInfo,
  setMousePosition,
  logger,
  generateSlidesFromTitle,
  setStoryPoints,
  handleFormSubmit,
  setShowInitialContainers,
  setLoading,
  isFormOpen,
  setIsFormOpen,
  setShowPreview,
  layoutMode,
  setLayoutMode,
  nodePositions,
  setNodePositions,
}) => {
  const user = useUser?.() || {};
  const { isExp, prototype } = user;
  const isI2 = isExp && prototype === 'I2';

  const userId = user?.userId || 'anon';
  const selectedDatabase = user?.selectedDatabase || 'default';
  const hasSP = Array.isArray(storyPoints) && storyPoints.length > 0;

  const handleOpenPreviewCTA = useCallback(() => {
    setShowPreview(true);
  }, [setShowPreview]);

  useEffect(() => {
    if (isI2) {
      setIsFormOpen(false);
    }
    setShowInitialContainers(!hasSP);
  }, [isI2, hasSP, setIsFormOpen, setShowInitialContainers]);

  const primaryKey = useMemo(
    () => `gv:storyPoints:${userId}:${selectedDatabase}`,
    [userId, selectedDatabase]
  );
  const fallbackKey = 'storyPointsSnapshot';

  const showInitial = isI2 ? !hasSP : (showInitialContainers || !hasSP);

  return (
    <>
      <main
        className={`flex-1 p-8 min-h-0 flex flex-col ${viewSettings?.showGrid ? 'bg-grid-pattern' : ''}`}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700" />
          </div>
        ) : showInitial ? (
          isI2 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <InitialWithCTA hasSP={hasSP} onOpenPreview={handleOpenPreviewCTA} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <InformationSteps />
            </motion.div>
          )
        ) : (
          <motion.div
            className="flex-1 bg-white relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
          >
            <GraphVisualization
              storyPoints={storyPoints}
              setStoryPoints={setStoryPoints}
              activeTool={activeTool}
              selectedNodes={selectedNodes}
              setSelectedNodes={setSelectedNodes}
              onNodeEdit={handleNodeEdit}
              lockedNodes={lockedNodes}
              setLockedNodes={setLockedNodes}
              networkRef={sharedNetworkRef}
              setSelectedNodeInfo={setSelectedNodeInfo}
              setMousePosition={setMousePosition}
              ActionTypes={ActionTypes}
              layoutMode={layoutMode}
              generateSlidesFromTitle={generateSlidesFromTitle}
              setLayoutMode={setLayoutMode}
              nodePositions={nodePositions}
              setNodePositions={setNodePositions}
            />
          </motion.div>
        )}
      </main>

      <CreateForm
        isOpen={isI2 ? false : isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={async (formData) => {
          setLoading(true);
          try {
            await handleFormSubmit({
              formData,
              logger,
              setStoryPoints,
              setShowInitialContainers,
              sharedNetworkRef,
              setLoading,
              onClearSelection: () => setSelectedNodes(new Set()),
            });
            setShowPreview(true);
          } finally {
            setLoading(false);
            setIsFormOpen(false);
          }
        }}
        loading={loading}
        storyPoints={storyPoints}
      />
    </>
  );
};

export default ContentArea;
