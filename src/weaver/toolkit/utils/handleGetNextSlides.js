import { callEmbeddings, callFetchSimilarSlides } from '@/weaver/signals/lib/api/apiClient';
import { logger, ActionTypes, InteractionTypes } from './logger/logger.js';

function toLower(v) { return typeof v === 'string' ? v.toLowerCase() : v; }

function extractMd5(v) {
  if (typeof v !== 'string') return null;
  const m = v.match(/[a-f0-9]{32}/i);
  return m ? m[0].toLowerCase() : null;
}

function getFullSlideId(str) {
  if (typeof str !== 'string') return null;
  const m = str.match(/^([a-f0-9]{32})_slide_(\d+)$/i);
  return m ? `${m[1].toLowerCase()}_slide_${parseInt(m[2], 10)}` : null;
}

function tryExtractSlideNumber(slide) {
  if (Number.isInteger(slide?.slide_number)) return slide.slide_number;
  if (typeof slide?.id === 'string') {
    const m = slide.id.match(/_slide_(\d+)$/i);
    if (m) return parseInt(m[1], 10);
  }
  if (Number.isInteger(slide?.slideNumber)) return slide.slideNumber;
  return null;
}

function buildFullId(md5, n) {
  if (!md5) return null;
  const num = Number(n);
  if (!Number.isInteger(num)) return null;
  return `${md5}_slide_${num}`;
}

function ensureFullSlideId(slide, idxFallback = 0) {
  const fullFromId  = getFullSlideId(slide?.id);
  const fullFromObj = getFullSlideId(slide?.object_id);
  if (fullFromId)  return fullFromId;
  if (fullFromObj) return fullFromObj;

  const md5 = extractMd5(slide?.object_id) || extractMd5(slide?.id);
  const n   = tryExtractSlideNumber(slide);
  const full = buildFullId(md5, n);
  if (full) return full;

  if (md5) return `${md5}_slide_${idxFallback}`;

  return `slide_${Date.now()}_${idxFallback}`;
}

const handleGetNextSlides = async (
  selectedNodes,
  sharedNetworkRef,
  storyPoints,
  setStoryPoints,
  setIsLoading,
  driver,
  lockedNodes,
) => {
  const safeLocked = lockedNodes instanceof Set
    ? lockedNodes
    : Array.isArray(lockedNodes)
      ? new Set(lockedNodes)
      : new Set();

  let selectedId = null;
  if (selectedNodes instanceof Set) selectedId = Array.from(selectedNodes)[0];
  else if (Array.isArray(selectedNodes)) selectedId = selectedNodes[0];
  else if (typeof selectedNodes === 'string') selectedId = selectedNodes;
  if (!selectedId && sharedNetworkRef?.current) {
    const sel = sharedNetworkRef.current.getSelectedNodes?.() || [];
    if (sel.length) selectedId = sel[0];
  }
  if (!selectedId) {
    alert('Please select a story point or slide to retrieve more slides.');
    return;
  }

  const nodes = sharedNetworkRef.current?.body?.data?.nodes;
  const edges = sharedNetworkRef.current?.body?.data?.edges;
  if (!nodes || !edges) {
    setIsLoading?.(false);
    return;
  }

  const node = nodes.get(selectedId);
  if (!node) {
    alert('Invalid node selected – please try again.');
    return;
  }

  const storyPointId =
    node.group === 'slide' && node.parentId ? node.parentId : node.id;

  if (node.group !== 'storypoint' && node.group !== 'slide') {
    alert('Please select a story point or slide to retrieve more slides.');
    return;
  }

  const sp = storyPoints.find(sp => sp.id === storyPointId);
  if (!sp) {
    setIsLoading?.(false);
    return;
  }

  let embedding;
  try {
    setIsLoading?.(true);
    const { embedding: emb } = await callEmbeddings(sp.description);
    embedding = emb;
  } catch {
    alert('Failed to generate embedding.');
    setIsLoading?.(false);
    return;
  }

  let fetched;
  try {
    fetched = await callFetchSimilarSlides(embedding, 6);
  } catch {
    alert('Failed to fetch similar slides.');
    setIsLoading?.(false);
    return;
  }

  const existingIds = new Set(
    (sp.slides || []).map(s => toLower(s.object_id)).filter(Boolean)
  );

  const unique = fetched.filter(s => {
    const fullObj =
      getFullSlideId(s.object_id) ||
      getFullSlideId(s.id) ||
      buildFullId(extractMd5(s.object_id) || extractMd5(s.id), tryExtractSlideNumber(s));

    return !!(fullObj && s.content?.trim() && !existingIds.has(fullObj.toLowerCase()));
  });

  const lockedSlidesCount = nodes.get()
    .filter(n =>
      n.group === 'slide' &&
      n.parentId === storyPointId &&
      safeLocked.has(n.id)
    )
    .length;

  logger.logInteraction(ActionTypes.CONTENT, {
    interaction_type: InteractionTypes.SLIDE_ALTERNATIVE_FETCH,
    component: 'GraphVisualization:RetrieveAlternativeSlides',
    input_data: {
      storyPointId,
      existingSlideCount: sp.slides?.length || 0,
      requestedSlides: 6
    },
    metadata: {
      spDescription: sp.description,
      lockedSlidesCount
    },
    output_data: {
      retrievedSlidesCount: unique.length,
      retrievedSlidesIds: unique.map(s => s.object_id)
    }
  });

  if (unique.length === 0) {
    sharedNetworkRef.current.redraw();
    alert('No new slides found. Try again or select a different story point.');
    setIsLoading?.(false);
    return;
  }

  const toRemove = nodes.get().filter(n =>
    n.parentId === storyPointId &&
    n.group === 'slide' &&
    !safeLocked.has(n.id)
  );
  toRemove.forEach(n => {
    edges.remove(`edge_${n.id}_${storyPointId}`);
    nodes.remove(n.id);
  });

  const raw = unique.slice(0, 3);
  const toShow = raw.map((slide, idx) => {
    const fullId = ensureFullSlideId(slide, idx);
    return {
      id: fullId,
      object_id: fullId,
      content: slide.content,
      title: slide.title,
      percentage: slide.percentage ?? Math.round((slide.similarity || 0) * 100),
      visible: true,
      type: `Slide ${idx + 1}`,
      slide_number: tryExtractSlideNumber(slide)
    };
  });

  const updatedSPs = storyPoints.map(sp_ =>
    sp_.id === storyPointId
      ? { ...sp_, slides: [...(sp_.slides || []), ...toShow] }
      : sp_
  );
  setStoryPoints(updatedSPs);

  const spIdx = storyPoints.findIndex(sp_ => sp_.id === storyPointId);
  const PER_ROW = 5, SPACING_X = 600, SPACING_Y = 600,
        SLIDES_PER_ROW = 3, SLIDE_SPACING_X = 180, SLIDE_SPACING_Y = 140;
  const row = Math.floor(spIdx / PER_ROW), col = spIdx % PER_ROW;

  toShow.forEach((slide, i) => {
    const slideRow = Math.floor(i / SLIDES_PER_ROW);
    const slidesInRow = Math.min(SLIDES_PER_ROW, toShow.length - slideRow * SLIDES_PER_ROW);
    const slideCol = i % SLIDES_PER_ROW;
    const offsetX = (slideCol - (slidesInRow - 1) / 2) * SLIDE_SPACING_X;
    const x = col * SPACING_X + offsetX;
    const y = row * SPACING_Y + 120 + slideRow * SLIDE_SPACING_Y;

    const nodeId = `${storyPointId}_${slide.id}`;

    nodes.add({
      id: nodeId,
      group: 'slide',
      parentId: storyPointId,
      shape: 'box',
      image: undefined,
      x, y, size: 44,
      title: (slide.content || '').substring(0, 150),
      locked: safeLocked.has(nodeId),
      slideData: { object_id: slide.object_id, slide_number: slide.slide_number }
    });

    edges.add({
      id: `edge_${nodeId}_${storyPointId}`,
      from: nodeId,
      to: storyPointId,
      label: `${slide.percentage}%`,
      arrows: 'to',
      smooth: { type: 'cubicBezier', roundness: 0.3 },
      font: { size: 16, color: '#2B7CE9', strokeWidth: 0 }
    });
  });

  sharedNetworkRef.current.redraw();
  setIsLoading?.(false);
};

export default handleGetNextSlides;
