import { useEffect } from 'react';
import { getViewportAnchorForSlide } from '@/weaver/toolkit/utils/graph/getViewportAnchorForSlide';

type Args = {
  networkRef: React.MutableRefObject<any>;
  hoveredNode: any;
  setHoveredPos: (pos: { x: number; y: number }) => void;
};

export function useAnchorRecalc({ networkRef, hoveredNode, setHoveredPos }: Args) {
  useEffect(() => {
    const net = networkRef.current;
    if (!net) return;

    const recalc = () => {
      if (hoveredNode && hoveredNode.group === 'slide') {
        const nodeId = hoveredNode.id || hoveredNode?.nodeId || hoveredNode?.options?.id;
        const anchor = nodeId ? getViewportAnchorForSlide(net, nodeId) : null;
        if (anchor) setHoveredPos({ x: anchor.x, y: anchor.y });
      }
    };

    net.on('zoom', recalc);
    net.on('dragEnd', recalc);
    net.on('resize', recalc);

    return () => {
      net.off('zoom', recalc);
      net.off('dragEnd', recalc);
      net.off('resize', recalc);
    };
  }, [hoveredNode, networkRef, setHoveredPos]);
}
