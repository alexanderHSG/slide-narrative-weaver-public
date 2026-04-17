import { useEffect } from 'react';

type Props = {
  setIsAuthenticated: (val: boolean) => void;
  setShowLogin: (val: boolean) => void;
  setUserId: (id: string) => void;
  setProlificId: (id: string) => void;
  setHasConsented: (val: boolean) => void;
};

export const useInitializeUserFromStorage = ({
  setIsAuthenticated,
  setShowLogin,
  setUserId,
  setProlificId,
  setHasConsented,
}: Props) => {
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    const prolificId = localStorage.getItem('prolificId');

    if (token) {
      setIsAuthenticated(true);
      setShowLogin(false);
    }

    if (userId && prolificId) {
      setUserId(userId);
      setProlificId(prolificId);
      setHasConsented(true);
    }
  }, []);
};
