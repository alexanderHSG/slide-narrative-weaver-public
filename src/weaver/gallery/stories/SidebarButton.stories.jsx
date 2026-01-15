import React from 'react';
import { action } from 'storybook/actions';
import { Home, Settings } from 'lucide-react';
import SidebarButton from '@/weaver/stage/components/RightSidebar/SidebarButton';

export default {
  title: 'Components/SidebarButton',
  component: SidebarButton,
  argTypes: {
    icon: {
      control: {
        type: 'select',
        options: { Home, Settings },
        mapping: { Home, Settings },
      },
    },
    tooltip:  { control: 'text' },
    title:    { control: 'text' },
    disable:  { control: 'boolean' },
    onClick:  { action: 'clicked' },
    className:{ table: { disable: true } },
  },
};

const Template = (args) => <SidebarButton {...args} />;

export const Default = Template.bind({});
Default.args = {
  icon:     Home,
  onClick:  action('onClick'),
  tooltip:  'Go Home',
  title:    'Home',
  disable:  false,
};

export const Disabled = Template.bind({});
Disabled.args = {
  ...Default.args,
  disable: true,
};