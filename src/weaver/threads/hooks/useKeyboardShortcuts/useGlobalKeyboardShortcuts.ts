import { useEffect } from 'react';

type Props = {
  canUndo: boolean;
  canRedo: boolean;
  handleUndo: () => void;
  handleRedo: () => void;
  activeTool: string;
  setActiveTool: (tool: string) => void;
  sharedNetworkRef: React.RefObject<any>;
};

export const useGlobalKeyboardShortcuts = ({
  canUndo,
  canRedo,
  handleUndo,
  handleRedo,
  activeTool,
  setActiveTool,
  sharedNetworkRef,
}: Props) => {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput =
        tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable;

      if (isInput) return;

      const key = e.key.toLowerCase();

      if ((e.ctrlKey || e.metaKey) && key === 'z' && !e.shiftKey && canUndo) {
        e.preventDefault();
        handleUndo();
        return;
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        ((key === 'z' && e.shiftKey) || key === 'y') &&
        canRedo
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.code === 'Space' && !e.repeat && sharedNetworkRef.current) {
        e.preventDefault();

        const prevTool = activeTool;
        setActiveTool('hand');

        const network = sharedNetworkRef.current;
        network.setOptions({
          interaction: {
            dragView: true,
            dragNodes: false,
            selectable: false,
          },
        });
        document.body.style.cursor = 'grab';

        const handleSpaceUp = (upEvent: KeyboardEvent) => {
          if (upEvent.code === 'Space') {
            upEvent.preventDefault();
            setActiveTool(prevTool);
            network.setOptions({
              interaction: {
                dragView: false,
                dragNodes: true,
                selectable: true,
              },
            });
            document.body.style.cursor = 'default';
            window.removeEventListener('keyup', handleSpaceUp);
          }
        };

        window.addEventListener('keyup', handleSpaceUp);
      }
    };


    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [canUndo, canRedo, handleUndo, handleRedo, activeTool, setActiveTool, sharedNetworkRef]);
};
