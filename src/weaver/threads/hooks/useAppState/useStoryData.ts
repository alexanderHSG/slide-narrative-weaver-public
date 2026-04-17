import { useState, useEffect } from 'react';

export type StoryPoint = {
  id: string;
  description: string;
};

const STORY_POINTS_STORAGE_KEY = 'storyPointsSnapshot';

export function useStoryData() {
  const [storyPoints, setStoryPoints] = useState<StoryPoint[]>(() => {
    const saved = localStorage.getItem(STORY_POINTS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORY_POINTS_STORAGE_KEY, JSON.stringify(storyPoints));
  }, [storyPoints]);


  const [showImages, setShowImages] = useState<boolean>(() => {
    const saved = localStorage.getItem('showImages');
    return saved ? JSON.parse(saved) : false;
  });

  const [nodePositions, setNodePositions] = useState(() => {
    try {
      const stored = localStorage.getItem('nodePositions');
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });

  const [editingStoryPoint, setEditingStoryPoint] = useState<StoryPoint | null>(null);

  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);

  return {
    storyPoints,
    setStoryPoints,
    showImages,
    setShowImages,
    editingStoryPoint,
    setEditingStoryPoint,
    isFormOpen,
    setIsFormOpen,
    nodePositions,
    setNodePositions,
  } as const;
}