export const layoutStyles = [
  {
    layout: {
      hierarchical: {
        enabled: true,
        direction: 'LR',
        sortMethod: 'directed',
        levelSeparation: 250,
        nodeSpacing: 200,
      },
    },
  },
  {
    layout: {
      hierarchical: {
        enabled: true,
        direction: 'UD',
        sortMethod: 'directed',
        levelSeparation: 150,
        nodeSpacing: 150,
      },
    },
  },
  {
    layout: {
      hierarchical: {
        enabled: false,
      },
    },
    physics: {
      enabled: true,
      stabilization: true,
      solver: 'forceAtlas2Based',
      forceAtlas2Based: {
        gravitationalConstant: -50,
        centralGravity: 0.01,
        springLength: 100,
        springConstant: 0.08,
      },
    },
  },
  {
    layout: {
      hierarchical: {
        enabled: true,
        direction: 'LR',
        sortMethod: 'directed',
        levelSeparation: 100,
        nodeSpacing: 100,
        treeSpacing: 100,
      },
    },
  },
  {
    layout: {
      hierarchical: {
        enabled: true,
        direction: 'LR',
        sortMethod: 'directed',
        levelSeparation: 400,
        nodeSpacing: 300,
        treeSpacing: 300,
      },
    },
  },
];