import { ActionTypes, InteractionStatus } from '@/weaver/toolkit/utils/logger/logger.js'

export const handleLogin = async (
  token: string,
  setIsAuthenticated: (val: boolean) => void,
  setShowLogin: (val: boolean) => void,
  logInteraction: Function
) => {
  localStorage.setItem('authToken', token);
  setIsAuthenticated(true);
  setShowLogin(false);

  await logInteraction(ActionTypes.AUTH, {
    status: InteractionStatus.COMPLETED,
    component: 'Login',
  });
};
