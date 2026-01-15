import { useEffect, useRef, useState } from 'react';
import { evaluateSlidesForStoryPoint } from '@/weaver/toolkit/utils/evaluateSlidesForStoryPoints';

export interface Slide {
  id: string;
  content: string;
  slide_number?: number;
}

export interface StoryPoint {
  id: string;
  description: string;
  slides?: Slide[];
}

export interface GptSlideEvaluation {
  slide_number: number;
  score: number;
  issues: string;
}

export type SlideEvalMap = Record<string, GptSlideEvaluation>;

const STORAGE_KEY = 'slideEvaluationsMap';

export function useStoryPointEvaluations(
  storyPoints: StoryPoint[]
): {
  slideEvaluationsMap: Record<string, SlideEvalMap>;
  slideEvaluationsLoading: Record<string, boolean>;
  evaluatingSPId: string | string[] | null;
  reEvaluateSP: (sp: StoryPoint) => Promise<void>;
} {
  const [slideEvaluationsMap, setSlideEvaluationsMap] = useState<Record<string, SlideEvalMap>>(
    () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    }
  );
  const [slideEvaluationsLoading, setSlideEvaluationsLoading] = useState<Record<string, boolean>>(
    {}
  );
  const [evaluatingSPId, setEvaluatingSPId] = useState<string | string[] | null>(null);
  const alreadyEvaluatedSPs = useRef<Set<string>>(
    new Set(Object.keys(slideEvaluationsMap))
  );

  useEffect(() => {
    if (!storyPoints?.length) return;

    const unevaluated = storyPoints.filter(sp => {
      if (!sp.slides?.length) return false;
      if (!slideEvaluationsMap[sp.id]) return true;
      if (Object.keys(slideEvaluationsMap[sp.id]).length !== sp.slides.length) return true;
      const existingKeys = new Set(Object.keys(slideEvaluationsMap[sp.id]));
      const expectedKeys = new Set(sp.slides.map(slide => `${sp.id}_${slide.id}`));
      for (let key of expectedKeys) {
        if (!existingKeys.has(key)) return true;
      }
      return false;
    })

    if (unevaluated.length === 0) return;

    let cancelled = false;
    const toEvalIds = unevaluated.map((sp) => sp.id);
    setEvaluatingSPId(toEvalIds);

    setSlideEvaluationsLoading((prev) => {
      const m = { ...prev };
      toEvalIds.forEach((id) => (m[id] = true));
      return m;
    });

    (async () => {
      const allResults: Record<string, SlideEvalMap> = { ...slideEvaluationsMap };

      for (const sp of unevaluated) {
        const slidesForEval = sp.slides!.map((slide, i) => ({
          slide_number: slide.slide_number ?? i + 1,
          content: slide.content,
        }));
        try {
          const gptResult = await evaluateSlidesForStoryPoint(
            sp.description,
            slidesForEval
          );
          const slideEvalMap: SlideEvalMap = {};
          gptResult.forEach((ev) => {
            const match = sp.slides!.find(
              (s, i) =>
                s.slide_number === ev.slide_number ||
                (s.slide_number == null && i + 1 === ev.slide_number)
            );
            if (match) slideEvalMap[`${sp.id}_${match.id}`] = ev;
          });
          allResults[sp.id] = slideEvalMap;
          alreadyEvaluatedSPs.current.add(sp.id);
        } catch {
          allResults[sp.id] = {};
        }
      }

      if (!cancelled) {
        setSlideEvaluationsMap(allResults);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allResults));
        setSlideEvaluationsLoading({});
        setEvaluatingSPId(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storyPoints]);

  const reEvaluateSP = async (sp: StoryPoint) => {
  if (!sp.description || !sp.slides?.length) return;

  setEvaluatingSPId(sp.id);
  setSlideEvaluationsLoading((prev) => ({ ...prev, [sp.id]: true }));

  const existingEvalMap = slideEvaluationsMap[sp.id] || {};

  const slidesForEval = sp.slides
    .filter((slide, i) => !existingEvalMap[`${sp.id}_${slide.id}`])
    .map((slide, i) => ({
      slide_number: slide.slide_number ?? i + 1,
      content: slide.content,
    }));

  let newEvalMap: SlideEvalMap = { ...existingEvalMap };

  try {
    if (slidesForEval.length) {
      const gptResult = await evaluateSlidesForStoryPoint(
        sp.description,
        slidesForEval
      );
      gptResult.forEach((ev) => {
        const match = sp.slides!.find(
          (s, i) =>
            s.slide_number === ev.slide_number ||
            (s.slide_number == null && i + 1 === ev.slide_number)
        );
        if (match) newEvalMap[`${sp.id}_${match.id}`] = ev;
      });
    }

    setSlideEvaluationsMap((prev) => {
      const updated = { ...prev, [sp.id]: newEvalMap };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    alreadyEvaluatedSPs.current.add(sp.id);
  } catch {
    // ignore errors
  }

  setSlideEvaluationsLoading((prev) => ({ ...prev, [sp.id]: false }));
  setEvaluatingSPId(null);
};

  return {
    slideEvaluationsMap,
    slideEvaluationsLoading,
    evaluatingSPId,
    reEvaluateSP,
  };
}
