import { syncNetworkWithState as _sync, setupSlidePersistence as _setup } from '@/weaver/toolkit/utils/syncUtils'; // ← jeśli masz już te importy, usuń pierwszą linię

function sanitizeId(v: string) {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  if (/^[A-Za-z0-9._-]+$/.test(trimmed)) return trimmed;

  if (/^SP_\d+_\d+_slide_\d+$/.test(trimmed)) {
    const parts = trimmed.split('_');
    if (parts[1]) return parts[1];
  }
  const m = trimmed.match(/([A-Za-z0-9._-]{6,})/g);
  return m && m.length ? m[0] : null;
}

function buildSlideUrl(objectId: string | number | boolean | null) {
  return objectId
    ? `/.netlify/functions/slide?objectId=${encodeURIComponent(objectId)}`
    : null;
}

export const handleNodeEdit = (nodeId: any, storyPoints: any[], setEditingStoryPoint: (arg0: any) => void) => {
  if (!Array.isArray(storyPoints)) {
    console.warn('storyPoints is not an array:', storyPoints);
    return;
  }
  const sp = storyPoints.find(s => s.id === nodeId);
  if (sp) {
    setEditingStoryPoint(sp);
  } else {
    console.warn(`No story point found for nodeId: ${nodeId}`);
  }
};

export const handleSaveStoryPoint = async (
  storyPointId: any,
  newDescription: string | any[],
  shortTitle: any,
  slideCount: any,
  setStoryPoints: (arg0: (prev: any) => any) => void,
  sharedNetworkRef: { current: { body: { data: { nodes: any; }; }; redraw: () => void; }; }
) => {
  setStoryPoints((prev: any[]) =>
    prev.map((sp: { id: any; }) =>
      sp.id === storyPointId
        ? { ...sp, description: newDescription, shortTitle, slideCount }
        : sp
    )
  );

  const vis = sharedNetworkRef?.current?.body?.data?.nodes;
  if (vis && vis.get(storyPointId)) {
    const label = shortTitle
      ? `SP\n${shortTitle}`
      : `SP\n${newDescription.slice(0, 60)}${newDescription.length > 60 ? '…' : ''}`;
    vis.update({ id: storyPointId, label });
    sharedNetworkRef.current.redraw();
  }

  try {
    await callSaveStoryPoint({
      storyPointId,
      description: newDescription,
      shortTitle,
      slideCount
    });
  } catch (err) {
    console.error('❌ callSaveStoryPoint failed:', err);
    throw err;
  }

  return true;
};

export const handleRegenerateStoryPoint = async (
  storyPointId: any,
  slideCount: any,
  refinementPrompt: any,
  {
    storyPoints,
    setStoryPoints,
    sharedNetworkRef,
    lockedNodes,
  }: any
) => {
  const currentSP = storyPoints.find((sp: { id: any; }) => sp.id === storyPointId);
  if (!currentSP) throw new Error('Story point not found');

  let result;
  try {
    result = await callRegenerateStoryPoint({
      storyPointId,
      refinementPrompt,
      slideCount
    });
  } catch (err) {
    console.error('❌ callRegenerateStoryPoint failed:', err);
    throw err;
  }

  const regeneratedSlides = result.slides || [];
  if (!Array.isArray(regeneratedSlides) || regeneratedSlides.length === 0) {
    throw new Error('No slides returned from regeneration');
  }

  const lockedIdx = new Set();
  (currentSP.slides || []).forEach((s: { id: any; }, idx: unknown) => {
    const visId = `${storyPointId}_${s.id}`;
    if (lockedNodes.has(visId)) lockedIdx.add(idx);
  });

  const newSlides = regeneratedSlides.map((slide, i) => ({
    ...slide,
    id: `${slide.id}_reg_${Date.now()}_${i}`,
    visible: true
  }));
  const merged = [
    ...(currentSP.slides || []).filter((_: any, idx: unknown) => lockedIdx.has(idx)),
    ...newSlides
  ].map(s => ({ ...s, visible: true }));

  setStoryPoints((prev: any[]) =>
    prev.map((sp: { id: any; }) =>
      sp.id === storyPointId
        ? { ...sp, slides: merged }
        : sp
    )
  );

  const nodes = sharedNetworkRef.current?.body?.data?.nodes;
  const edges = sharedNetworkRef.current?.body?.data?.edges;
  if (nodes && edges) {
    (currentSP.slides || []).forEach((slide: { id: any; }, idx: unknown) => {
      if (!lockedIdx.has(idx)) {
        const visId = `${storyPointId}_${slide.id}`;
        edges.remove(`edge_${visId}_${storyPointId}`);
        nodes.remove(visId);
      }
    });

    merged.forEach(slide => {
      const visId = `${storyPointId}_${slide.id}`;
      const objectId = sanitizeId(slide.object_id || slide.id);
      const imgUrl   = buildSlideUrl(objectId);

      const nodeData = {
        id: visId,
        group: 'slide',
        parentId: storyPointId,
        shape: objectId ? 'image' : 'box',
        image: objectId ? imgUrl : undefined,
        label: (slide.content || '').slice(0, 50) + ((slide.content || '').length > 50 ? '…' : ''),
        slideData: {
          ...slide,
          object_id: objectId || slide.object_id
        }
      };

      if (nodes.get(visId)) nodes.update(nodeData);
      else nodes.add(nodeData);

      edges.add({
        id: `edge_${visId}_${storyPointId}`,
        from: visId,
        to: storyPointId,
        arrows: 'to',
        label: `${slide.percentage ?? Math.round((slide.similarity || 0) * 100)}%`
      });
    });

    sharedNetworkRef.current.redraw();
  }

  return merged;
};
