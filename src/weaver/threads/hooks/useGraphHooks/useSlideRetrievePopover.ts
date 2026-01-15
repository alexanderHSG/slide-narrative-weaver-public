import { useEffect, useState, MutableRefObject } from 'react';

type PopupInfo = { nodeId: string; x: number; y: number } | null;

export function useSlideRetrievePopover(networkRef: MutableRefObject<any>) {
  const [popupInfo, setPopupInfo] = useState<PopupInfo>(null);

  const openPopoverForNode = (nodeId: string) => {
    const net = networkRef.current;
    if (!net) return;
    const pos = net.getPositions([nodeId])[nodeId];
    if (!pos) return;
    const domPos = net.canvasToDOM(pos);
    setPopupInfo({ nodeId, x: domPos.x, y: domPos.y });
  };

  const closePopover = () => setPopupInfo(null);

  useEffect(() => {
    const net = networkRef.current;
    if (!net || !popupInfo) return;

    const update = () => {
      const p = net.getPositions([popupInfo.nodeId])[popupInfo.nodeId];
      const dom = net.canvasToDOM(p);
      setPopupInfo(prev => (prev ? { ...prev, x: dom.x, y: dom.y } : null));
    };
    const close = () => setPopupInfo(null);

    net.on('zoom', update);
    net.on('dragEnd', update);
    net.on('zoom', close);
    net.on('dragEnd', close);

    return () => {
      net.off('zoom', update);
      net.off('dragEnd', update);
      net.off('zoom', close);
      net.off('dragEnd', close);
    };
  }, [networkRef, popupInfo]);

  return { popupInfo, openPopoverForNode, closePopover, setPopupInfo };
}
