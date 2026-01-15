import React from 'react';
import AdvancedSearchPanel from '@/weaver/stage/components/AdvancedSearchPanel/AdvancedSearchPanel';
import { X, Search } from 'lucide-react';

export default {
  title: 'Components/AdvancedSearchPanel',
  component: AdvancedSearchPanel,
  tags: ['autodocs'],

  argTypes: {
    onClose: { action: 'onClose' },
    setShowInitialContainers: { action: 'setShowInitialContainers' },
    setStoryPoints: { action: 'setStoryPoints' },
    interactionTracker: { table: { disable: true }, control: false },
    networkRef:            { table: { disable: true }, control: false },
    driver:                { table: { disable: true }, control: false },
  },
};

const mockDriver = {
  session: () => ({
    run: () => Promise.resolve({ records: [] }),
    close: () => {},
  }),
};

const mockNetworkRef = {
  current: {
    getSelectedNodes: () => [],
    body: { data: { nodes: new Map() } },
    redraw: () => {},
  },
};

const mockTracker = {
  trackInteraction: (type, payload) => {
    console.log('interaction', type, payload);
    return Promise.resolve();
  },
};

const Template = (args) => <AdvancedSearchPanel {...args} />;

export const Default = Template.bind({});
Default.args = {
  interactionTracker: mockTracker,
  networkRef:         mockNetworkRef,
  setShowInitialContainers: () => {},
  setStoryPoints:          () => {},
  storyPoints:             [],
  driver:                  mockDriver,
  onClose:                 () => {},
  isActiveTool:            'search',
};
