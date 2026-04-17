import { useCallback } from "react"
import { generateShortTitleFromDescription } from "@/weaver/signals/lib/storyPoints/generateShortTitleFromDescription"
import { truncateWords } from "@/weaver/toolkit/utils/truncateWords"
import {
  callSaveStoryPoint,
  callRegenerateStoryPoint,
} from "@/weaver/signals/lib/api/apiClient";

export type Slide = {
  id: string
  parentId: string
  content: string
  [key: string]: any
}

export type StoryPoint = {
  id: string
  title: string
  description: string
  shortTitle?: string
  slideCount?: number
  createdAt?: string
  updatedAt?: string
  slides?: Slide[]
  [key: string]: any
}

type Params = {
  storyPoints: StoryPoint[]
  setStoryPoints: (pts: StoryPoint[]) => void
  setEditingStoryPoint: (pt: StoryPoint | null) => void
  addToHistory: (pts: StoryPoint[]) => void
  sharedNetworkRef: React.MutableRefObject<any>
  lockedNodes: Set<string>
}

export const useStoryPointEditDialog = ({
  storyPoints,
  setStoryPoints,
  setEditingStoryPoint,
  addToHistory,
  sharedNetworkRef,
  lockedNodes,
}: Params) => {
  const handleSave = useCallback(
    async (
      storyPointId: string,
      newDescription: string,
      newShortTitle: string,
      slideCount: number = 3,
      slides?: Slide[]
    ) => {
      const shortTitle = newShortTitle || truncateWords(newDescription, 6);

      const isLockedNodeId = (slideId: string): boolean => {
        const check = (lockedId: string) => lockedId.endsWith(slideId);
        if (lockedNodes instanceof Set) {
          for (const id of lockedNodes) {
            if (check(id)) return true;
          }
          return false;
        }
        if (Array.isArray(lockedNodes)) {
          return lockedNodes.some(check);
        }
        return false;
      };

      try {
        await callSaveStoryPoint({
          storyPointId,
          description: newDescription,
          shortTitle,
          slideCount,
          slides,
        });

        const updated = storyPoints.map((p) => {
          if (p.id !== storyPointId) return p;

          if (!slides || !Array.isArray(slides)) {
            return {
              ...p,
              description: newDescription,
              shortTitle,
              slideCount,
            };
          }

          const existingSlides = Array.isArray(p.slides) ? p.slides : [];

          console.log("=== DEBUG SAVE ===");
          console.log("lockedNodes:", lockedNodes);
          console.log("incoming slides:", slides);
          console.log("existing slides:", p.slides);

          const lockedSlides = existingSlides.filter(s => {
            const isLocked = isLockedNodeId(s.id);
            console.log(`→ slide ${s.id} locked:`, isLocked);
            return isLocked;
          });
          const newSlides = slides.filter(s => !isLockedNodeId(s.id));


          const mergedSlides = [...lockedSlides, ...newSlides].slice(0, slideCount);

          return {
            ...p,
            description: newDescription,
            shortTitle,
            slideCount,
            slides: mergedSlides,
          };
        });

        setStoryPoints(updated);
        addToHistory(updated);
      } catch (err) {
        console.error("Error saving story point:", err);
        alert("Failed to save story point. Please try again.");
      }
    },
    [storyPoints, setStoryPoints, addToHistory, lockedNodes]
  );


  const handleRegenerate = useCallback(
  async (
    storyPointId: string,
    slideCount: number,
    refinementPrompt: string
  ) => {
    try {
      const { slides }: { slides: Slide[] } = await callRegenerateStoryPoint({
        storyPointId,
        slideCount,
        refinementPrompt,
      });

      const updated = storyPoints.map((p) => {
        if (p.id !== storyPointId) return p;

        const isLockedNodeId = (slideId: string): boolean => {
          const check = (lockedId: string) => lockedId.endsWith(slideId);
          if (lockedNodes instanceof Set) {
            for (const id of lockedNodes) {
              if (check(id)) return true;
            }
            return false;
          }
          if (Array.isArray(lockedNodes)) {
            return lockedNodes.some(check);
          }
          return false;
        };

        const existingSlides = Array.isArray(p.slides) ? p.slides : [];
        const lockedSlides = existingSlides.filter(s => isLockedNodeId(s.id));
        const newSlides = slides.filter(s => !isLockedNodeId(s.id));
        const mergedSlides = [...lockedSlides, ...newSlides].slice(0, slideCount);

        return {
          ...p,
          slides: mergedSlides,
          slideCount,
          updatedAt: new Date().toISOString(),
        };
      });

      setStoryPoints(updated);
      addToHistory(updated);

      return slides;
    } catch (err) {
      console.error("Error regenerating story point:", err);
      throw err;
    }
  },
  [storyPoints, setStoryPoints, addToHistory, lockedNodes]
);


  return {
    handleSave,
    handleRegenerate,
  }
}
