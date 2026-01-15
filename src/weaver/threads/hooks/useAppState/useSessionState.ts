import { useState } from 'react';

export function useSessionState() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [hasConsented, setHasConsented] = useState(false);
  const [sessionData, setSessionData] = useState({ sessionId: null, prolificId: null, startTime: null });
  const [userId, setUserId] = useState(null);
  const [prolificId, setProlificId] = useState(null);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState<boolean | null>(null);

  return {
    isAuthenticated, setIsAuthenticated,
    showLogin, setShowLogin,
    hasConsented, setHasConsented,
    sessionData, setSessionData,
    userId, setUserId,
    prolificId, setProlificId,
    hasCompletedTutorial, setHasCompletedTutorial,
  } as const;
}