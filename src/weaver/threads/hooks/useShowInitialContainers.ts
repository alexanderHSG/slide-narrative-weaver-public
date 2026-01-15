import { useState, useEffect } from 'react';

export const useShowInitialContainers = (): [boolean, (val: boolean) => void] => {
  const [showInitialContainers, setShowInitialContainers] = useState(() => {
    const saved = localStorage.getItem('showInitialContainers');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('showInitialContainers', JSON.stringify(showInitialContainers));
  }, [showInitialContainers]);

  return [showInitialContainers, setShowInitialContainers];
};
