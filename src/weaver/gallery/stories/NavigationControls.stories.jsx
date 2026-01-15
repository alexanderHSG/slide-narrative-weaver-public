import React from 'react';
import { action } from 'storybook/actions';
import NavigationControls from '@/weaver/stage/components/NavigationControls/NavigationControls';

const networkStub = {
  current: {
    getViewPosition: () => ({ x: 0, y: 0 }),
    moveTo: ({ position, animation }) => {
      action('moveTo')({ position, animation });
    },
  },
};

export default {
  title: 'Components/NavigationControls',
  component: NavigationControls,
  parameters: {
    layout: 'centered',
  },
  args: {
    networkRef: networkStub,
  },
};

const Template = args => <NavigationControls {...args} />;

export const Default = Template.bind({});
Default.args = {
};