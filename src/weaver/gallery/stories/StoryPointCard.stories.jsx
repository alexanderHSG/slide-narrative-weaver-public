import React, { useState } from 'react';
import { action } from 'storybook/actions';
import StoryPointCard from '@/weaver/stage/components/StoryPointCard/StoryPointCard';

export default {
  title: 'Components/StoryPointCard',
  component: StoryPointCard,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    isTitleLoading: { control: 'boolean' },
    aiLoading:     { control: 'boolean' },
    slideLoading:  { control: 'boolean' },
  },
};

const SAMPLE_SP = {
  id: 'sp1',
  shortTitle: 'Sample SP',
  description: 'This is a **sample** description for the StoryPointCard.\n\nFeel free to edit it!',
};

const Template = ({ isTitleLoading, aiLoading, slideLoading }) => {
  const [editingSpId, setEditingSpId] = useState(null);
  const [refiningSpId, setRefiningSpId] = useState(null);

  return (
    <StoryPointCard
      sp={SAMPLE_SP}
      isEditing={editingSpId === SAMPLE_SP.id}
      setEditingSpId={setEditingSpId}
      refiningSpId={refiningSpId}
      setRefiningSpId={setRefiningSpId}
      onSaveDescription={action('onSaveDescription')}
      onRefineAndGenerate={action('onRefineAndGenerate')}
      onDelete={action('onDelete')}
      isTitleLoading={isTitleLoading}
      aiLoading={aiLoading}
      slideLoading={slideLoading}
      toastProps={{ toast: [], showToast: action('showToast') }}
    />
  );
};

export const Default = {
  render: Template,
  args: {
    isTitleLoading: false,
    aiLoading:      false,
    slideLoading:   false,
  },
  name: '🔍 View mode',
};

export const Editing = {
  render: Template,
  args: {
    isTitleLoading: false,
    aiLoading:      false,
    slideLoading:   false,
  },
  play: async ({ canvasElement }) => {
    const btn = canvasElement.querySelector('button[aria-label="Edit"]');
    if (btn) btn.click();
  },
  name: '✏️ Editing mode',
};

export const Refining = {
  render: Template,
  args: {
    isTitleLoading: false,
    aiLoading:      false,
    slideLoading:   false,
  },
  play: async ({ canvasElement }) => {
    const btn = Array.from(canvasElement.querySelectorAll('button'))
      .find(b => b.textContent?.includes('Refine with AI'));
    if (btn) btn.click();
  },
  name: '🤖 Refining mode',
};