import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Toast } from '@/weaver/stage/components/Toast/Toast';

export default {
  title: 'Components/Toast',
  component: Toast,
  parameters: {
    layout: 'centered',
    docs: {
      inlineStories: false,
    },
  },
  argTypes: {
    toast: {
      control: 'object',
      description: 'An object with `{ type, msg }`',
    },
  },
};

const Template = (args) => (
  <AnimatePresence>
    <Toast {...args} />
  </AnimatePresence>
);

export const Success = {
  render: Template,
  args: {
    toast: { type: 'success', msg: 'Operation completed successfully!' },
  },
  name: '✅ Success',
};

export const Error = {
  render: Template,
  args: {
    toast: { type: 'error', msg: 'Something went wrong—please retry.' },
  },
  name: '❌ Error',
};

export const Playground = {
  render: Template,
  args: {
    toast: { type: 'success', msg: 'Custom message here' },
  },
  argTypes: {
    toast: {
      control: {
        type: 'object',
      },
    },
  },
  name: '🛠 Playground',
};