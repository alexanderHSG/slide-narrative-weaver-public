export const networkOptions = {
  nodes: { shape: 'box', font: { multi: true } },
  groups: {
    storypoint: {
      shape: 'box',
      widthConstraint: { minimum: 320, maximum: 320 },
      heightConstraint: { minimum: 150, maximum: 140 },
      margin: 32,
      font: { align: 'left', multi: true, size: 18, face: 'Inter, Arial, sans-serif', vadjust: 2 },
      color: {
        background: '#F5FBFA',
        border: '#1B8067',
        highlight: { background: '#E0FFF4', border: '#24B47E' }
      },
      borderWidth: 5,
      shadow: { enabled: true, color: 'rgba(27,128,103,0.12)', size: 34, x: 0, y: 10 }
    },
    slide: {
      shape: 'image',
      size: 44,
      font: {
        color: '#1F2937',
        size: 12,
        face: 'Arial',
        background: 'rgba(255, 255, 255, 0.7)',
        strokeWidth: 2,
        strokeColor: '#ffffff',
        vadjust: 3,
        multi: true
      },
      borderWidth: 1,
      shapeProperties: { useBorderWithImage: true, useImageSize: false }
    }
  },
  layout: { hierarchical: false },
  interaction: { multiselect: true, dragNodes: true, dragView: true, zoomView: true, hover: true, zoomSpeed: 0.45 },
  physics: { enabled: false },
  edges: { smooth: { type: 'cubicBezier', roundness: 0.36, forceDirection: 'vertical' }, arrows: { to: true } }
};
