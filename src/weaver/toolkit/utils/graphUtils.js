import { logger, ActionTypes, InteractionTypes } from './logger/logger';
import { layoutStyles } from '@/weaver/stage/components/RightSidebar/layoutStyles';

export const applyNextLayout = (currentIndex, setIndex, networkRef) => {
  const nextIndex = (currentIndex + 1) % layoutStyles.length;
  setIndex(nextIndex);

  if (networkRef?.current) {
    networkRef.current.setOptions(layoutStyles[nextIndex]);
    networkRef.current.stabilize();
    networkRef.current.fit({
      animation: { duration: 1000, easingFunction: 'easeInOutQuad' },
    });
  }

  logger.logInteraction(ActionTypes.VISUALIZATION, {
    interaction_type: InteractionTypes.GRAPH_LAYOUT_TOGGLE,
    component: 'LayoutControls',
    input_data: { layoutIndex: nextIndex },
  });
};

export const clearSlidesSelection = (networkRef, setSelectedNodes) => {
  if (!networkRef?.current) return;

  networkRef.current.body.data.nodes.get().forEach(node => {
    if (node.group === 'slide') {
      networkRef.current.body.data.nodes.update({
        id: node.id,
        color: {
          background: '#F3F4F6',
          border: '#D1D5DB',
          highlight: {
            background: '#F3F4F6',
            border: '#D1D5DB',
          },
        },
        borderWidth: 1,
      });
    }
  });

  localStorage.removeItem('selectedSlides');
  setSelectedNodes(new Set());

  const exportButton = document.querySelector('[data-export-button]');
  if (exportButton) {
    exportButton.querySelector('span').textContent = 'Export Selected Slides';
  }
};

