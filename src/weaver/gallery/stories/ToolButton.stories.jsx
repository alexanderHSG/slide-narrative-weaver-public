import React from 'react';
import { Home, Settings } from 'lucide-react';
import ToolButton from '@/weaver/stage/components/Toolbar/ToolButton';

export default {
  title: 'Components/ToolButton',
  component: ToolButton,
  argTypes: {
    icon: {
      control: {
        type: 'select',
        options: { Home, Settings },
        mapping: { Home, Settings },
      },
    },
    active:   { control: 'boolean' },
    disabled: { control: 'boolean' },
    text:     { control: 'text' },
    tooltip:  { control: 'text' },
  },
};

const Template = args => <ToolButton {...args} />;

export const Default = Template.bind({});
Default.args = {
  icon: Home,
  text: 'Home',
  tooltip: 'Go to homepage',
  active: false,
  disabled: false,
};

export const Active = Template.bind({});
Active.args = { ...Default.args, active: true };

export const Disabled = Template.bind({});
Disabled.args = { ...Default.args, disabled: true };