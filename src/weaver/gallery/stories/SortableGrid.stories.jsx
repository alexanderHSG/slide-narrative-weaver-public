import React, { useState } from 'react';
import { action } from 'storybook/actions';
import SortableGrid from '@/weaver/stage/components/GraphVisualization/SortableGrid';

export default {
  title: 'Components/SortableGrid',
  component: SortableGrid,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    storyPointId: { control: 'text' },
  },
};

const makeSlides = (count) =>
  Array.from({ length: count }).map((_, i) => ({
    id:         `slide${i + 1}`,
    object_id:  `obj${i + 1}`,
    content:    `Slide #${i + 1} content…`,
    similarity: Math.random(),
    title:      `Slide ${i + 1}`,
  }));

const Template = ({ initialSlides, storyPointId, slideEvaluationsMap }) => {
  const [slides, setSlides] = useState(initialSlides);
  const [selectedSlides, setSelectedSlides] = useState(new Set());

  const toggleSlide = (key) => {
    setSelectedSlides((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      action('toggleSlide')(key);
      return next;
    });
  };

  return (
    <div style={{ width: 600, height: 400 }}>
      <SortableGrid
        slides={slides}
        setSlides={(s) => {
          setSlides(s);
          action('setSlides')(s);
        }}
        onEnlargeImage={action('onEnlargeImage')}
        slideEvaluationsMap={slideEvaluationsMap}
        storyPointId={storyPointId}
        selectedSlides={selectedSlides}
        toggleSlide={toggleSlide}
      />
    </div>
  );
};

export const Default = Template.bind({});
Default.args = {
  initialSlides:       makeSlides(5),
  storyPointId:        'sp1',
  slideEvaluationsMap: { sp1: {} },
};

export const ManySlides = Template.bind({});
ManySlides.args = {
  initialSlides:       makeSlides(10),
  storyPointId:        'sp1',
  slideEvaluationsMap: { sp1: {} },
};