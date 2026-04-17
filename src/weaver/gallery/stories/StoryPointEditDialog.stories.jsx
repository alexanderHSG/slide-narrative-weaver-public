import React from 'react';
import { action } from 'storybook/actions';
import StoryPointEditDialog from '@/weaver/stage/components/StoryPointEditDialog/StoryPointEditDialog';

export default {
  title: 'Components/StoryPointEditDialog',
  component: StoryPointEditDialog,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    storyPoint: { control: 'object' },
    isOpen:     { control: 'boolean' },
  },
};

const Template = (args) => <StoryPointEditDialog {...args} />;

const sampleSP = {
  id: 'sp1',
  description: 'Here’s a **sample** description.\n\nEdit me or ask the AI to refine it!',
  shortTitle: 'Sample SP',
  slides: [
    { id: 'slide1', content: 'First slide…', object_id: 'abc' },
    { id: 'slide2', content: 'Second slide…', object_id: 'def' },
  ],
};

export const Open = {
  render: Template,
  args: {
    isOpen: true,
    storyPoint: sampleSP,
    onClose:       action('onClose'),
    onSave:        action('onSave(id, newDescription, shortTitle, slideCount)'),
    onRegenerate:  action('onRegenerate(id, slideCount, refinementPrompt)'),
  },
  name: '📝 Edit dialog open',
};