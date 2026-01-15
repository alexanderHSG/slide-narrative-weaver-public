import React, { createRef } from 'react';
import { action } from 'storybook/actions';
import RightSidebar from '@/weaver/stage/components/RightSidebar/RightSidebar';
import { Plus, FileText, Eraser, FileUp, Search } from 'lucide-react';

export default {
  title: 'Components/RightSidebar',
  component: RightSidebar,
  parameters: {
    layout: 'centered',
  },

  args: {
    onCreateClick:    action('onCreateClick'),
    networkRef:       createRef(),
    setSelectedNodes: action('setSelectedNodes'),
    setShowPreview:   action('setShowPreview'),
    setActiveTool:    action('setActiveTool'),
  },
  argTypes: {
    networkRef:       { table: { disable: true } },
    setSelectedNodes: { table: { disable: true } },
    setShowPreview:   { table: { disable: true } },
    setActiveTool:    { table: { disable: true } },
  },
};

const Template = (args) => <RightSidebar {...args} />;

export const Default = Template.bind({});
Default.args = {
};

export const WithFilterPanel = Template.bind({});
WithFilterPanel.play = async ({ canvasElement, args }) => {
  const searchBtn = canvasElement.querySelector('.search-btn button');
  if (searchBtn) searchBtn.click();
};
