import React from 'react';
import ExportDialog from '@/weaver/stage/components/ExportDialog/ExportDialog'

export default {
  title: 'Components/ExportDialog',
  component: ExportDialog,
  tags: ['autodocs'],
  argTypes: {
    onClose: { action: 'closed' },
    onExport: { action: 'exportRequested' },
    selectedSlides: { control: 'object' },
  },
};

const Template = (args) => <ExportDialog {...args} />;

export const OneSlide = Template.bind({});
OneSlide.args = {
  isOpen: true,
  selectedSlides: new Set(['slide-1']),
};

export const MultipleSlides = Template.bind({});
MultipleSlides.args = {
  isOpen: true,
  selectedSlides: new Set(['slide-1', 'slide-2', 'slide-3']),
};
