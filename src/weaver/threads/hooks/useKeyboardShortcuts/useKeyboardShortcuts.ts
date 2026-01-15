import { useGlobalKeyboardShortcuts } from "./useGlobalKeyboardShortcuts";

export const useKeyboardShortcuts = ({
  canUndo,
  canRedo,
  handleUndo,
  handleRedo,
  activeTool,
  setActiveTool,
  sharedNetworkRef,
}) => {
  useGlobalKeyboardShortcuts({
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    activeTool,
    setActiveTool,
    sharedNetworkRef,
  });
};
