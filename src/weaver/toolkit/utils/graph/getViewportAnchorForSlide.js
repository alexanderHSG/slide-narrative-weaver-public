export function getViewportAnchorForSlide(network, nodeId) {

  const obj = network?.body?.nodes?.[nodeId];
  if (!obj?.shape?.boundingBox) return null;

  const bb = obj.shape.boundingBox;
  const bottomCenterCanvas = { x: (bb.left + bb.right) / 2, y: bb.bottom };
  const dom = network.canvasToDOM(bottomCenterCanvas);

  const rect = network.body.container.getBoundingClientRect();
  const x = rect.left + dom.x + window.scrollX;
  const y = rect.top  + dom.y + window.scrollY;

  return { x, y };
}
