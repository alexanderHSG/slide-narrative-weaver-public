import { useEffect, useState, MutableRefObject } from 'react';
import { scoreToColor } from '@/weaver/toolkit/utils/graph/scoreToColor.js';

type EvalStylingArgs = {
  nodesRef: MutableRefObject<any>;
  edgesRef: MutableRefObject<any>;
  networkRef: MutableRefObject<any>;
  storyPoints: any[];
  slideEvaluationsMap: Record<string, any>;
  slideEvaluationsLoading: boolean;
  evaluatingSPId: string | string[] | null | undefined;
};

export function useEvaluationStyling({
  nodesRef,
  edgesRef,
  networkRef,
  storyPoints,
  slideEvaluationsMap,
  slideEvaluationsLoading,
  evaluatingSPId,
}: EvalStylingArgs) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let interval: any;
    const ids = Array.isArray(evaluatingSPId)
      ? evaluatingSPId
      : evaluatingSPId
        ? [evaluatingSPId]
        : [];
    if (ids.length > 0) {
      interval = setInterval(() => setTick((t) => t + 1), 400);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [evaluatingSPId]);

  useEffect(() => {
    if (!nodesRef.current || !edgesRef.current || !networkRef.current) return;

    storyPoints.forEach(sp => {
      const evals = slideEvaluationsMap[sp.id] || {};

      const scores = (sp.slides || [])
        .map(slide => evals[`${sp.id}_${slide.id}`]?.score)
        .filter((s: number | null) => s != null);
      const best = scores.length ? Math.max(...scores) : null;

      const isEval = Array.isArray(evaluatingSPId)
        ? evaluatingSPId.includes(sp.id)
        : evaluatingSPId === sp.id;

      nodesRef.current.update({
        id: sp.id,
        color: {
          background: '#F5FBFA',
          border: isEval
            ? (Date.now() % 1000 < 500 ? '#FFD700' : '#FFB800')
            : best != null ? scoreToColor(best) : '#1B8067',
          highlight: {
            background: '#E0FFF4',
            border: isEval
              ? (Date.now() % 1000 < 500 ? '#FFD700' : '#FFB800')
              : best != null ? scoreToColor(best) : '#1B8067',
          }
        },
        borderWidth: isEval ? 6 : 5,
        shadow: isEval
          ? { enabled: true, color: '#FFD700AA', size: 48, x: 0, y: 0 }
          : { enabled: true, color: 'rgba(27,128,103,0.12)', size: 34, x: 0, y: 10 }
      });

      (sp.slides || []).forEach(slide => {
        const key = `${sp.id}_${slide.id}`;
        const score = evals[key]?.score;
        const issues = evals[key]?.issues || '';
        const edgeId = `edge_${key}_${sp.id}`;

        if (edgesRef.current.get(edgeId)) {
          edgesRef.current.update({
            id: edgeId,
            label: score != null ? `${score}/10` : ''
          });
        }

        if (nodesRef.current.get(key)) {
          const old = nodesRef.current.get(key).slideData || {};
          nodesRef.current.update({
            id: key,
            slideData: { ...old, issues }
          });
        }
      });
    });

    networkRef.current.redraw();
  }, [
    slideEvaluationsMap,
    slideEvaluationsLoading,
    storyPoints,
    evaluatingSPId,
    tick,
    nodesRef,
    edgesRef,
    networkRef
  ]);
}
