import React, { createRef } from 'react';
import Toolbar from '@/weaver/stage/components/Toolbar/Toolbar';
import { action } from 'storybook/actions';

export default {
  title: 'Components/Toolbar',
  component: Toolbar,
  parameters: {
    layout: 'padded',
  },
  args: {
    onUndo: action('onUndo'),
    onRedo: action('onRedo'),
    selectedNodes: new Set(),
    onLockNodes: action('onLockNodes'),
    onUnlockNodes: action('onUnlockNodes'),
    onClearAll: action('onClearAll'),
    onDeleteNode: action('onDeleteNode'),
    onDeleteSlides: action('onDeleteSlides'),
    networkRef: createRef(),
    networkContainerRef: createRef(),
    layoutMode: 'vertical',
    setLayoutMode: action('setLayoutMode'),
    lockedNodes: new Set(),
    setNodePositions: action('setNodePositions'),
  },
  argTypes: {
    layoutMode: {
      control: { type: 'radio' },
      options: ['vertical', 'horizontal'],
    },
  },
};

export const Default = {};

export const WithSelection = {
  args: {
    selectedNodes: new Set(['sp1', 'sp1_slide1']),
    lockedNodes: new Set(['sp1_slide1']),
  },
};