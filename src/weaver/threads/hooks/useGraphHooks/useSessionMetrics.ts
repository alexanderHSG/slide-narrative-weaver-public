import { useEffect, useRef } from 'react';
import { logger, ActionTypes, InteractionTypes } from '@/weaver/toolkit/utils/logger/logger.js';

type StoryPoint = { slides?: unknown[] };

export function useSessionMetrics(storyPoints: StoryPoint[]) {
  const lastTotalRef = useRef<number | null>(null);

  useEffect(() => {
    const total = Array.isArray(storyPoints)
      ? storyPoints.reduce((sum, sp) => sum + (sp.slides?.length || 0), 0)
      : 0;

    if (lastTotalRef.current === total) return;
    lastTotalRef.current = total;

    logger.logInteraction(ActionTypes.VISUALIZATION, {
      interaction_type: InteractionTypes.GRAPH_STATE_SNAPSHOT,
      component: 'GraphVisualization',
      metadata: { canvas_slide_count: total },
    });

    if (logger?.prolificId && logger?.sessionId) {
      logger.logCanvasLoad(total);
    }
  }, [storyPoints]);
}
