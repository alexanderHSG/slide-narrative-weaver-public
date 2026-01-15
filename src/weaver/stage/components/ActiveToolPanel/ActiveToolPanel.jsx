import { motion } from 'framer-motion';
import AdvancedSearchPanel from '../AdvancedSearchPanel/AdvancedSearchPanel';

const ActiveToolPanel = ({
  activeTool,
  pdfProcessorRef,
  interactionTrackerRef,
  analyticsRef,
  sharedNetworkRef,
  setShowInitialContainers,
  setStoryPoints,
  storyPoints,
  setShowPreview,
  driver,
  setActiveTool,
  setFilterActive,
  filterActive
}) => {
  if (!['pdf', 'search', 'analytics'].includes(activeTool)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed right-24 top-24 z-50"
    >

      {activeTool === 'search' && (
        <AdvancedSearchPanel
          analytics={analyticsRef.current}
          interactionTracker={interactionTrackerRef.current}
          networkRef={sharedNetworkRef}
          setShowInitialContainers={setShowInitialContainers}
          setStoryPoints={setStoryPoints}
          setShowPreview={setShowPreview}
          storyPoints={storyPoints}
          driver={driver}
          onClose={() => {
            setActiveTool(null);
            setFilterActive(false);
          }}
        />
      )}
    </motion.div>
  );
};

export default ActiveToolPanel;
