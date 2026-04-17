import React, { useRef } from 'react';
import { action } from 'storybook/actions';
import GraphVisualization from '@/weaver/stage/components/GraphVisualization/GraphVisualization';

const fakeDriver = {
  session: () => ({
    run:   async () => ({ records: [] }),
    close: () => {},
  }),
};

const manySlides = Array.from({ length: 10 }).map((_, i) => ({
  id:         `slide${i+1}`,
  object_id:  `obj${i+1}`,
  content:    `Slide #${i+1} content…`,
  similarity: Math.random(),
  title:      `Slide ${i+1}`,
}));

const sampleStoryPoints = [
  {
    id:         'sp1',
    description:'Intro to the topic',
    shortTitle: 'Intro',
    slides:     manySlides.slice(0,3),
  },
  {
    id:         'sp2',
    description:'Deep dive section',
    shortTitle: 'Deep Dive',
    slides:     manySlides.slice(3),
  },
];

export default {
  title:      'Components/GraphVisualization',
  component:  GraphVisualization,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    layoutMode: {
      control:  { type: 'radio' },
      options:  ['vertical','horizontal'],
    },
  },
};

const Template = (args) => {
  const networkRef = useRef(null);
  return <GraphVisualization {...args} networkRef={networkRef} />;
};

export const Vertical = Template.bind({});
Vertical.args = {
  storyPoints:      sampleStoryPoints,
  setStoryPoints:   action('setStoryPoints'),
  selectedNodes:    new Set(),
  setSelectedNodes: action('setSelectedNodes'),
  onNodeEdit:       action('onNodeEdit'),
  lockedNodes:      new Set(),
  setIsLoading:     action('setIsLoading'),
  driver:           fakeDriver,
  nodePositions:    {},
  setNodePositions: action('setNodePositions'),
  layoutMode:       'vertical',
};

export const Horizontal = Template.bind({});
Horizontal.args = {
  ...Vertical.args,
  layoutMode: 'horizontal',
};
