/**
 * Animates a set of nodes on the vis-network by temporarily highlighting them.
 * @param {Object} networkRef  – React ref to your vis Network instance
 * @param {Array}  nodes       – Array of node objects ({ id, x, y, color, … })
 * @param {Object} options     – { duration, highlightColor, originalColor }
 */

export function handleNetworkAnimation(
  networkRef,
  nodes,
  { duration = 1000, highlightColor = '#4CAF50', originalColor = '#F3F4F6' } = {}
) {
  if (!networkRef?.current) return;

  const originalStates = nodes.map(node => ({
    id: node.id,
    color: node.color || { background: originalColor },
    x: node.x,
    y: node.y,
  }));

  nodes.forEach(node => {
    networkRef.current.body.data.nodes.update({
      id: node.id,
      color: {
        background: highlightColor,
        border: node.color?.border || '#D1D5DB',
      },
    });
  });

  networkRef.current.setOptions({
    physics: {
      enabled: true,
      stabilization: { enabled: true, iterations: 20, updateInterval: 25 },
    },
  });

  setTimeout(() => {
    originalStates.forEach(({ id, color }) => {
      networkRef.current.body.data.nodes.update({ id, color });
    });
    networkRef.current.setOptions({ physics: { enabled: false } });
  }, duration);
}

/**
 * Filters nodes by `node.group === filterGroup` and then highlights them.
 * @param {Object} networkRef
 * @param {string} [filterGroup='filtered']
 * @param {Object} [animationOptions]
 */

export function applyFilters(
  networkRef,
  filterGroup = 'filtered',
  animationOptions = {}
) {
  if (!networkRef?.current) return;

  const nodes = networkRef.current.body.data.nodes.get();
  const filtered = nodes.filter(n => n.group === filterGroup);
  handleNetworkAnimation(networkRef, filtered, animationOptions);
}
