import React from 'react';
import CreateForm from '@/weaver/stage/components/CreateForm/CreateForm';
import { Plus, X, Network as NetworkIcon } from 'lucide-react';

export default {
  title: 'Components/CreateForm',
  component: CreateForm,
  tags: ['autodocs'],
  argTypes: {
    onClose:       { action: 'onClose' },
    onSubmit:      { action: 'onSubmit' },
    storyPoints:   { control: { type: null } },
  },
};

const Template = (args) => <CreateForm {...args} />;

export const EmptyNetwork = Template.bind({});
EmptyNetwork.args = {
  isOpen:        true,
  loading:       false,
  storyPoints:   [],
};

export const WithExistingPoints = Template.bind({});
WithExistingPoints.args = {
  isOpen:      true,
  loading:     false,
  storyPoints: [
    { id: 'sp_1', description: 'First point',  slides: [] },
    { id: 'sp_2', description: 'Second point', slides: [] },
  ],
};
