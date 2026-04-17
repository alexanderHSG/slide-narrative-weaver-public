import { useEffect, useRef } from 'react';

export function useAutoReevaluateSP(storyPoints, reEvaluateSP) {
  const prevRef = useRef(storyPoints);
  const didInit = useRef(false);

  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true;
      prevRef.current = storyPoints;
      return;
    }
    storyPoints.forEach((sp, i) => {
      const prev = prevRef.current[i];
      if (!prev) return;
      const descChanged = prev.description !== sp.description;
      const slidesChanged =
        (prev.slides?.length !== sp.slides?.length) ||
        (sp.slides || []).some((s, j) => prev.slides && prev.slides[j]?.content !== s.content);
      if (descChanged || slidesChanged) reEvaluateSP(sp);
    });
    prevRef.current = storyPoints;
  }, [storyPoints, reEvaluateSP]);
}