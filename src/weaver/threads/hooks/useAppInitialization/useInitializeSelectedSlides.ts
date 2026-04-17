import { useEffect } from 'react';

export const useInitializeSelectedSlides = (setSelectedNodes: (nodes: Set<string>) => void) => {
  useEffect(() => {
    const savedSelections = localStorage.getItem('selectedSlides');
    const initialSelectedNodes: Set<string> = savedSelections ? new Set<string>(JSON.parse(savedSelections)) : new Set<string>();

    const exportButton = document.querySelector('[data-export-button]');
    if (exportButton) {
      const span = exportButton.querySelector('span');
      if (span) span.textContent = `Export Selected Slides`;
    }

    setSelectedNodes(initialSelectedNodes);
  }, []);
};
