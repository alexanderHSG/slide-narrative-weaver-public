import { useEffect } from 'react';

export const useSelectedSlides = (
  selectedNodes: Set<string>,
  setSelectedNodes: (nodes: Set<string>) => void
) => {
  useEffect(() => {
    const savedSelections = localStorage.getItem('selectedSlides');
    const initialSelectedNodes: Set<string> = savedSelections ? new Set<string>(JSON.parse(savedSelections)) : new Set<string>();

    const exportButton = document.querySelector('[data-export-button]');
    if (exportButton) {
      exportButton.querySelector('span')!.textContent = `Export Selected Slides`;
    }

    setSelectedNodes(initialSelectedNodes);
  }, []);

  useEffect(() => {
    const exportButton = document.querySelector('[data-export-button]');
    if (exportButton) {
      exportButton.querySelector('span')!.textContent = `Export Selected Slides`;
    }

    if (selectedNodes.size === 0) {
      localStorage.removeItem('selectedSlides');
    } else {
      localStorage.setItem('selectedSlides', JSON.stringify(Array.from(selectedNodes)));
    }
  }, [selectedNodes]);
};
