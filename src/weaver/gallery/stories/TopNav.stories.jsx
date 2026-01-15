import React, { useState } from 'react';
import { action } from 'storybook/actions';
import TopNav from '@/weaver/stage/components/TopNav/TopNav';

export default {
  title: 'Components/TopNav',
  component: TopNav,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    onExport: action('onExport'),
    selectedCount: 0,
    activeMenu: 'home',
  },
  argTypes: {
    selectedCount: { control: 'number' },
    activeMenu: {
      control: { type: 'text' },
      description: 'The currently active top‐level menu key',
    },
  },
};

const Template = ({ onExport, selectedCount, activeMenu: initialMenu }) => {
  const [activeMenu, setActiveMenu] = useState(initialMenu);
  return (
    <TopNav
      onExport={onExport}
      selectedCount={selectedCount}
      activeMenu={activeMenu}
      setActiveMenu={setActiveMenu}
    />
  );
};

export const Default = Template.bind({});
Default.args = {
  selectedCount: 0,
  activeMenu: 'home',
};

export const WithSelection = Template.bind({});
WithSelection.args = {
  selectedCount: 5,
  activeMenu: 'home',
};

export const DifferentMenu = Template.bind({});
DifferentMenu.args = {
  selectedCount: 2,
  activeMenu: 'preview',
};
