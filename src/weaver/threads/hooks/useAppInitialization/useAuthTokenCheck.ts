import { useEffect } from "react";

export function useAuthTokenCheck(setIsAuthenticated, setShowLogin) {
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setIsAuthenticated(true);
      setShowLogin(false);
    }
  }, []);
}
