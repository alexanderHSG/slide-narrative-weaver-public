import { PER_ROW, SPACING_X, SPACING_Y, SLIDES_PER_ROW, SLIDE_SPACING_X, MAX_SLIDES, SLIDE_SPACING_Y } from './constants.js';
import { getStoryPointLabel } from './labels.js';
import { scoreToColor } from './scoreToColor.js';

type EvalMap = Record<string, Record<string, { score?: number | null; issues?: string }>>;

type Params = {
  storyPoints: any[];
  layoutMode: 'horizontal' | 'vertical';
  nodePositions: Record<string, { x: number; y: number }>;
  slideEvaluationsMap: EvalMap;
  safeLockedNodes: Set<string>;
  nodes: any;
  edges: any;
};

const FN_PATH = '/.netlify/functions/slide';

function sanitizeId(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  if (/^[A-Za-z0-9._-]+$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/([A-Za-z0-9._-]{6,})/g);
  return m && m.length ? m[0] : null;
}

function buildSlideUrl(objectId?: string | null): string | undefined {
  return objectId ? `${FN_PATH}?objectId=${encodeURIComponent(objectId)}` : undefined;
}

export function populateGraphDatasets({
  storyPoints,
  layoutMode,
  nodePositions,
  slideEvaluationsMap,
  safeLockedNodes,
  nodes,
  edges,
}: Params) {
  storyPoints.forEach((sp, idx) => {
    let spX: number, spY: number;
    if (layoutMode === 'horizontal') {
      const row = Math.floor(idx / PER_ROW);
      const col = idx % PER_ROW;
      spX = col * SPACING_X;
      spY = row * SPACING_Y - 50;
    } else {
      spX = 0;
      spY = idx * SPACING_Y - 40;
    }

    const spSlides = (sp.slides ?? []);
    const scores = spSlides
      .map((slide: any) => {
        const slideKey = `${sp.id}_${slide.id}`;
        return (slideEvaluationsMap[sp.id] || {})[slideKey]?.score ?? null;
      })
      .filter((s: number | null) => s != null) as number[];

    const bestScore = scores.length ? Math.max(...scores) : null;
    const borderColor = bestScore != null ? scoreToColor(bestScore) : '#1B8067';

    nodes.add({
      id: sp.id,
      label: getStoryPointLabel(sp, idx),
      group: 'storypoint',
      x: nodePositions[sp.id]?.x ?? spX,
      y: nodePositions[sp.id]?.y ?? spY,
      description: sp.description,
      font: {
        face: 'Inter, system-ui, sans-serif',
        size: 22,
        color: 'black',
        bold: true,
        align: 'left',
        vadjust: 5,
      },
      locked: safeLockedNodes.has(sp.id),
      color: {
        background: '#F5FBFA',
        border: borderColor,
        highlight: { background: '#E0FFF4', border: borderColor }
      },
      borderWidth: 5,
      shadow: { enabled: true, color: 'rgba(27,128,103,0.12)', size: 34, x: 0, y: 10 },
    });

    const actualSPX = nodePositions[sp.id]?.x ?? spX;
    const actualSPY = nodePositions[sp.id]?.y ?? spY;

    const visibleSlides = (sp.slides ?? []).slice(0, MAX_SLIDES);
    visibleSlides.forEach((slide: any, slideIdx: number, slidesArr: any[]) => {
      if (!slide.object_id) return;

      const slideKey = `${sp.id}_${slide.id}`;
      let slideX: number, slideY: number;

      if (layoutMode === 'horizontal') {
        const slideRow = Math.floor(slideIdx / SLIDES_PER_ROW);
        const slideCol = slideIdx % SLIDES_PER_ROW;
        const slidesInRow = Math.min(SLIDES_PER_ROW, slidesArr.length - slideRow * SLIDES_PER_ROW);
        const offsetX = (slideCol - (slidesInRow - 1) / 2) * SLIDE_SPACING_X;
        slideX = actualSPX + offsetX;
        slideY = actualSPY + 220 + slideRow * SLIDE_SPACING_Y;
      } else {
        const slideRow = slideIdx % SLIDES_PER_ROW;
        const slideCol = Math.floor(slideIdx / SLIDES_PER_ROW);
        slideX = actualSPX + 400 + slideCol * SLIDE_SPACING_X;
        slideY = actualSPY + slideRow * SLIDE_SPACING_Y - 140;
      }

      const slideEval = (slideEvaluationsMap[sp.id] || {})[slideKey];

      const objectId = sanitizeId(slide.object_id);
      const proxyUrl = buildSlideUrl(objectId);

      if (!nodes.get(slideKey)) {
        nodes.add({
          id: slideKey,
          label: safeLockedNodes.has(slideKey) ? '🔒' : ' ',
          group: 'slide',
          x: nodePositions[slideKey]?.x ?? slideX,
          y: nodePositions[slideKey]?.y ?? slideY,
          parentId: sp.id,
          slideData: {
            type: `Slide ${slide.slide_number ?? (slideIdx + 1)}`,
            content: slide.content || '',
            expanded: false,
            object_id: slide.object_id,
            slide_number: slide.slide_number ?? (slideIdx + 1),
            issues: slideEval?.issues || '',
            title: slide.title,
          },
          shape: 'image',
          image: proxyUrl,
          size: 44,
          font: {
            color: '#1F2937',
            size: 12,
            face: 'Arial',
            background: 'rgba(255, 255, 255, 0.7)',
            strokeWidth: 2,
            strokeColor: '#ffffff',
            vadjust: 3,
            multi: true,
          },
          shapeProperties: { useBorderWithImage: true, useImageSize: false },
          locked: safeLockedNodes.has(slideKey),
        });
      }

      const edgeId = `edge_${slideKey}_${sp.id}`;
      if (!edges.get(edgeId)) {
        edges.add({
          id: edgeId,
          from: slideKey,
          to: sp.id,
          arrows: 'from',
          smooth: { type: 'cubicBezier', forceDirection: 'vertical', roundness: 0 },
          label: slideEval?.score != null ? `${slideEval.score}/10` : '',
          font: { color: '#256029', size: 20, strokeWidth: 0, vadjust: 30 },
        });
      }
    });

    if ((sp.slides ?? []).length > MAX_SLIDES) {
      const showAllKey = `showall_${sp.id}`;
      const extraSlides = (sp.slides ?? []).length - MAX_SLIDES;
      let showAllX: number, showAllY: number;

      if (layoutMode === 'horizontal') {
        showAllX = actualSPX;
        showAllY = actualSPY + 120 + (SLIDES_PER_ROW > 1 ? SLIDE_SPACING_Y : 0) + 185;
      } else {
        showAllX = actualSPX + SPACING_X + 200;
        showAllY = actualSPY + (Math.min(MAX_SLIDES, 3)) * SLIDE_SPACING_Y - 400;
      }

      nodes.add({
        id: showAllKey,
        label: `+${extraSlides} more`,
        group: 'showall',
        x: showAllX,
        y: showAllY,
        parentId: sp.id,
        shape: 'box',
        color: { background: '#E8FFF6', border: '#38b48e' },
        font: { color: '#38b48e', size: 25 },
        borderWidth: 2,
        shadow: true,
      });
      edges.add({
        id: `edge_${showAllKey}_${sp.id}`,
        from: showAllKey,
        to: sp.id,
        arrows: '',
        smooth: { type: 'curvedCW', roundness: 0.15 },
      });
    }

    if (idx > 0) {
      const prev = storyPoints[idx - 1];
      edges.add({
        id: `edge_${prev.id}_${sp.id}`,
        from: prev.id,
        to: sp.id,
        arrows: 'to',
        color: { color: '#2E7D32' },
        width: 3,
        smooth: { type: 'cubicBezier', forceDirection: 'vertical', roundness: 0.36 },
      });
    }
  });
}
