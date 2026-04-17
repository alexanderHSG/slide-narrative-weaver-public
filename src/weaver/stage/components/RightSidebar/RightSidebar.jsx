import { motion } from 'framer-motion';
import {
  Plus,
  FileText,
  Eraser,
  FileUp,
  Search,
} from 'lucide-react';

import { useUser } from '../UserAccessWrapper/UserAccessWrapper';
import { logger, ActionTypes, InteractionTypes } from '@/weaver/toolkit/utils/logger/logger';
import SidebarButton from './SidebarButton';
import { clearSlidesSelection } from '@/weaver/toolkit/utils/graphUtils';

const RightSidebar = ({
  onCreateClick,
  networkRef,
  setSelectedNodes,
  setShowPreview,
  setActiveTool,
}) => {

  const { isExp, prototype } = useUser?.() || {};
  const isI2 = isExp && prototype === 'I2';

  const handleToolClick = (toolName, onClick) => async () => {
    setActiveTool(toolName);
    if (onClick) await onClick();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed right-4 top-56 bg-white rounded-lg shadow-sm border border-gray-200 z-20"
    >
      <div className="p-2 flex flex-col space-y-1">

        {!isI2 && (
          <SidebarButton
            icon={Plus}
            onClick={handleToolClick('create', async () => {
              await onCreateClick?.();
              logger.logInteraction(ActionTypes.STORY, {
                interaction_type: InteractionTypes.STORYPOINT_CREATE_OPEN,
                component: 'RightSidebar',
                metadata: { source: 'RightSidebar' },
              });
            })}
            tooltip="Start a new story presentation"
            className="create-story-btn"
          />
        )}

        <SidebarButton
          icon={FileText}
          onClick={handleToolClick('preview', () => {
            setShowPreview(true);
            logger.logInteraction(ActionTypes.VISUALIZATION, {
              interaction_type: InteractionTypes.STORYPOINT_PREVIEW_OPEN,
              component: 'PreviewModal',
              metadata: { source: 'RightSidebar' },
            });
          })}
          tooltip="Preview story and slides"
          setActiveTool={() => setActiveTool('previewSP')}
          className="preview-btn"
        />

        <SidebarButton
          icon={Eraser}
          onClick={handleToolClick('clear', async () => {
            await clearSlidesSelection(networkRef, setSelectedNodes);
            logger.logInteraction(ActionTypes.CONTENT, {
              interaction_type: InteractionTypes.SLIDE_DESELECT_ALL,
              component: 'RightSidebar',
              metadata: { mode: 'bulk_clear' },
            });
          })}
          tooltip="Clear all selected slides"
          className="clear-selection-btn"
          title="Clear Selected Slides"
        />

        <SidebarButton
          icon={FileUp}
          tooltip="Function is under development"
          disable
          className="upload-pdf-btn"
          title="PDF Processing"
        />

        <SidebarButton
          icon={Search}
          onClick={handleToolClick('search', () => {
            setActiveTool('search');
            logger.logInteraction(ActionTypes.SEARCH, {
              interaction_type: InteractionTypes.SEARCH_PANEL_OPEN,
              component: 'AdvancedSearchPanel',
              metadata: { source: 'RightSidebar' },
            });
          })}
          tooltip="Advanced search"
          className="search-btn"
          title="Advanced Search"
        />
      </div>
    </motion.div>
  );
};

export default RightSidebar;
