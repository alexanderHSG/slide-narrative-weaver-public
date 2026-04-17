import { useState } from 'react';

export const useGraphTutorialJoyride = () => {
  const [run, setRun] = useState(true);

  const steps = [
    {
      target: '.slide-node',
      content: 'Click to select a slide.',
    },
    {
      target: '.slide-node',
      content: 'Double click to zoom into a slide.',
    },
    {
      target: '.storypoint-node',
      content: 'Double click a Story Point to edit.',
    },
    {
      target: '.alt-slide-btn',
      content: 'Click here to retrieve alternative slides.',
    },
  ];

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    const finished = ['finished', 'skipped'].includes(status);
    if (finished) {
      setRun(false);
    }
  };

  return { run, steps, handleJoyrideCallback };
};
