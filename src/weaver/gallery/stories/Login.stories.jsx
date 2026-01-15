import React, { useState } from 'react';
import { action } from 'storybook/actions';
import Login from '@/weaver/stage/components/Login/Login';

export default {
  title: 'Components/Login',
  component: Login,
  parameters: {
    layout: 'centered',
  },
  args: {
    onLogin: action('onLogin'),
    onClose: action('onClose'),
  },
  argTypes: {
    isOpen: { table: { disable: true } },
  },
};

const Template = (args) => {
  const [open, setOpen] = useState(args.initiallyOpen);
  return (
    <Login
      {...args}
      isOpen={open}
      onClose={() => {
        action('onClose')();
        setOpen(false);
      }}
    />
  );
};

export const Open = Template.bind({});
Open.args = {
  initiallyOpen: true,
};