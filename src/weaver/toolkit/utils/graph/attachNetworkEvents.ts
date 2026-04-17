import { getViewportAnchorForSlide } from './getViewportAnchorForSlide';

type Params = {
  network: any;
  nodesRef: React.MutableRefObject<any>;
  setNodePositions: React.Dispatch<React.SetStateAction<Record<string, {x:number, y:number}>>>;
  setSelectedNodes: React.Dispatch<React.SetStateAction<Set<string>>>;
  setModalStorypointId: (id: string) => void;
  openPopoverForNode: (id: string) => void;
  setHoveredNode: (node: any) => void;
  setHoveredPos: (pos: { x: number; y: number }) => void;
  selectedRef: React.MutableRefObject<Set<string>>;
  onNodeEdit: (id: string) => void;
  onSlideDoubleClick: (nodeId: string, node: any) => void;
};

export function attachNetworkEvents({
  network,
  nodesRef,
  setNodePositions,
  setSelectedNodes,
  setModalStorypointId,
  openPopoverForNode,
  setHoveredNode,
  setHoveredPos,
  selectedRef,
  onNodeEdit,
  onSlideDoubleClick,
}: Params) {
  network.on('dragStart', (params: any) => {
    if (
      params.nodes.length &&
      nodesRef.current.get(params.nodes[0])?.group === 'storypoint'
    ) {
      network.setOptions({ interaction: { dragView: false, dragNodes: true } });
    }
  });

  network.on('dragEnd', (params: any) => {
    setNodePositions((prev) => {
      const updated = { ...prev };
      params.nodes.forEach((nodeId: string) => {
        const pos = network.getPositions([nodeId])[nodeId];
        if (pos) updated[nodeId] = pos;
      });
      return updated;
    });
    setTimeout(() => {
      network.setOptions({ interaction: { dragView: true, dragNodes: true } });
    }, 16);
  });

  network.on('click', (params: any) => {
    const clickedId = params.nodes[0];
    if (!clickedId) return;

    const node = nodesRef.current.get(clickedId);
    if (!node) return;

    if (node.group === 'showall') {
      setModalStorypointId(clickedId.replace('showall_', ''));
      return;
    }

    if (node.group === 'slide') {
      setSelectedNodes((prev) => {
        const next = new Set(prev);
        if (next.has(clickedId)) next.delete(clickedId);
        else next.add(clickedId);
        return next;
      });
      return;
    }

    if (node.group === 'storypoint') {
      openPopoverForNode(clickedId);
      return;
    }
  });

  network.on('doubleClick', async (params: any) => {
    if (!params.nodes.length) return;
    const nodeId = params.nodes[0];
    const node = nodesRef.current.get(nodeId);
    if (!node) return;

    if (node.group === 'storypoint') {
      onNodeEdit(nodeId);
      return;
    }

    if (node.group === 'slide') {
      onSlideDoubleClick(nodeId, node);
      return;
    }
  });

  network.on('hoverNode', (params: any) => {
    const nodeId = params.node;
    const node = nodesRef.current.get(nodeId);
    if (!node) return;

    if (node.group === 'storypoint') {
      network.body.container.style.cursor = 'url("/mouse-pointer-click.svg") 4 2, pointer';
      const borderColor = node?.color?.border || '#1b8067';
      nodesRef.current.update({
        id: nodeId,
        color: {
          border: borderColor,
          background: '#F5FBFA',
          highlight: { border: borderColor, background: '#F5FBFA' },
          hover: { border: borderColor, background: '#F5FBFA' },
        },
      });
      network.redraw();
    }

    if (node.group === 'slide') {
      network.body.container.style.cursor = 'url("/mouse-pointer-click.svg") 4 2, pointer';
      const anchor = getViewportAnchorForSlide(network, nodeId);
      if (anchor) {
        setHoveredNode(node);
        setHoveredPos({ x: anchor.x, y: anchor.y });
      }
    }
  });

  network.on('blurNode', (params: any) => {
    const nodeId = params.node;
    const node = nodesRef.current.get(nodeId);
    if (!node) return;

    network.body.container.style.cursor = 'default';

    if (node.group === 'storypoint') {
      const borderColor = node?.color?.border || '#1B8067';
      nodesRef.current.update({
        id: nodeId,
        color: {
          border: borderColor,
          background: '#F5FBFA',
          highlight: { border: borderColor, background: '#F5FBFA' },
          hover: { border: borderColor, background: '#F5FBFA' },
        },
      });
      network.redraw();
    }

    if (node.group === 'slide') {
    }
    setHoveredNode(null);
  });

  network.on('afterDrawing', (ctx: CanvasRenderingContext2D) => {
    const scale = network.getScale();
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 5 / scale;

    selectedRef.current.forEach((id) => {
      const node = nodesRef.current.get(id);
      if (!node || node.group !== 'slide') return;

      const pos = network.getPositions([id])[id];
      const obj = (network as any).body.nodes[id];
      if (pos && obj) {
        ctx.strokeRect(
          pos.x - obj.shape.width / 2 - 2 / scale,
          pos.y - obj.shape.height / 2 - 2 / scale,
          obj.shape.width + 4 / scale,
          obj.shape.height + 4 / scale
        );
      }
    });
  });
}
