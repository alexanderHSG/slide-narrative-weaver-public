import React, { useState, createRef } from 'react';
import { action } from 'storybook/actions';
import PreviewModal from '@/weaver/stage/components/PreviewModal/PreviewModal';

const fakeDriver = {
  session: () => ({
    run:   async () => ({ records: [] }),
    close: () => {},
  }),
};

const sampleStoryPoints = [
  {
    id: 'sp1',
    description: 'This is the first story point — an intro.',
    shortTitle: 'Intro SP',
    slides: [
      {
        id: 'slide1',
        object_id: 'img1',
        content: 'Content for slide 1',
        similarity: 0.75,
        title: 'Slide 1',
      },
      {
        id: 'slide2',
        object_id: 'img2',
        content: 'Content for slide 2',
        similarity: 0.60,
        title: 'Slide 2',
      },
    ],
  },
  {
    id: 'sp2',
    description: 'Second point dives deeper.',
    shortTitle: 'Deep SP',
    slides: [],
  },
];

export default {
  title: 'Components/PreviewModal',
  component: PreviewModal,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    isOpen: true,
    onClose: action('onClose'),
    enhanceDescription: async (desc, refinementPrompt) =>
      `${desc} (enhanced with "${refinementPrompt}")`,
    onRegenerate: action('onRegenerate'),
    sharedNetworkRef: createRef(),
    lockedNodes: new Set(),
    driver: fakeDriver,
  },
};

const Template = ({ storyPoints: initialSPs, setStoryPoints, ...rest }) => {
  const [sps, setSps] = useState(initialSPs);
  return (
    <PreviewModal
      {...rest}
      storyPoints={sps}
      setStoryPoints={setSps}
    />
  );
};

export const Default = {
  args: {
    storyPoints: sampleStoryPoints,
  },
};