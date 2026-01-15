import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { restrictToFirstScrollableAncestor, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { useMemo, useCallback, useRef, useState } from 'react';
import SelectedSlideCard from './SelectedSlideCard';

const EDGE_THRESHOLD = 12;
const SEG_PAD = 6;

const clamp = (n, min, max) => Math.max(min, Math.min(n, max));

function clampToBounds(boundsRef, inset = 0) {
  return ({ transform, draggingNodeRect }) => {
    if (!transform || !draggingNodeRect) return transform;
    const el = boundsRef?.current;
    if (!el) return transform;

    const b = el.getBoundingClientRect();
    const minX = b.left   - draggingNodeRect.left   + inset;
    const maxX = b.right  - draggingNodeRect.right  - inset;
    const minY = b.top    - draggingNodeRect.top    + inset;
    const maxY = b.bottom - draggingNodeRect.bottom - inset;

    return { ...transform, x: clamp(transform.x, minX, maxX), y: clamp(transform.y, minY, maxY) };
  };
}

export default function SelectedSlidesGrid({
  items,
  order,
  onOrderChange,
  onRemove,
  containerRef,
}) {
  const byKey = useMemo(() => {
    const m = new Map();
    for (const it of Array.isArray(items) ? items : []) {
      if (it && it.key) m.set(it.key, it);
    }
    return m;
  }, [items]);

  const orderedItems = useMemo(() => {
    const out = [];
    for (const k of Array.isArray(order) ? order : []) {
      const it = byKey.get(k);
      if (it && it.key) out.push(it);
    }
    return out;
  }, [order, byKey]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } })
  );

  const boundsRef = useRef(null);

  const [activeId, setActiveId] = useState(null);
  const [edgeCard, setEdgeCard] = useState({ left: false, right: false, top: false, bottom: false });
  const [edgeSeg, setEdgeSeg] = useState({ left: null, right: null, top: null, bottom: null });

  const handleDragStart = useCallback((e) => setActiveId(e?.active?.id ?? null), []);

  const handleDragMove = useCallback((e) => {
    const r = e?.active?.rect?.current?.translated || e?.active?.rect?.current?.initial;
    const el = boundsRef.current;
    if (!r || !el) return;

    const b = el.getBoundingClientRect();
    const nearLeft   = (r.left   - b.left)   <= EDGE_THRESHOLD;
    const nearRight  = (b.right  - r.right)  <= EDGE_THRESHOLD;
    const nearTop    = (r.top    - b.top)    <= EDGE_THRESHOLD;
    const nearBottom = (b.bottom - r.bottom) <= EDGE_THRESHOLD;

    setEdgeCard({ left: nearLeft, right: nearRight, top: nearTop, bottom: nearBottom });

    const nextSeg = { left: null, right: null, top: null, bottom: null };
    if (nearLeft || nearRight) {
      const segH = Math.min(b.height, r.height + 2 * SEG_PAD);
      const segTop = clamp(r.top - b.top - SEG_PAD, 0, b.height - segH);
      if (nearLeft)  nextSeg.left  = { top: segTop, height: segH };
      if (nearRight) nextSeg.right = { top: segTop, height: segH };
    }
    if (nearTop || nearBottom) {
      const segW = Math.min(b.width, r.width + 2 * SEG_PAD);
      const segLeft = clamp(r.left - b.left - SEG_PAD, 0, b.width - segW);
      if (nearTop)    nextSeg.top    = { left: segLeft, width: segW };
      if (nearBottom) nextSeg.bottom = { left: segLeft, width: segW };
    }
    setEdgeSeg(nextSeg);
  }, []);

  const clearDragState = useCallback(() => {
    setActiveId(null);
    setEdgeCard({ left: false, right: false, top: false, bottom: false });
    setEdgeSeg({ left: null, right: null, top: null, bottom: null });
  }, []);

  const handleDragEnd = useCallback((e) => {
    const { active, over } = e || {};
    clearDragState();
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onOrderChange(arrayMove(order, oldIndex, newIndex));
  }, [order, onOrderChange, clearDragState]);

  const handleDragCancel = clearDragState;

  if (!orderedItems.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-6xl mb-4">🗂️</div>
        <p className="text-sm text-slate-500">No slides selected.</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      modifiers={[clampToBounds(boundsRef, 0), restrictToFirstScrollableAncestor, restrictToWindowEdges]}
    >
      <SortableContext items={orderedItems.map(it => it.key)} strategy={rectSortingStrategy}>
        <div ref={boundsRef} className="relative overflow-hidden">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5 w-full max-w-full min-w-0">
            {orderedItems.map((it, idx) => (
              <SelectedSlideCard
                key={it.key}
                item={it}
                index={idx}
                onRemove={onRemove}
                isActive={activeId === it.key}
                edge={edgeCard}
              />
            ))}
          </div>

          <div className="pointer-events-none absolute inset-0">
            {edgeSeg.left && (
              <div className="absolute left-0 w-[6px] rounded-r-full animate-pulse"
                   style={{
                     top: `${edgeSeg.left.top}px`,
                     height: `${edgeSeg.left.height}px`,
                     boxShadow: '0 0 18px rgba(16,185,129,0.75), 0 0 32px rgba(16,185,129,0.45)',
                     background:'linear-gradient(180deg, rgba(16,185,129,0.95) 0%, rgba(16,185,129,0.6) 50%, rgba(16,185,129,0.95) 100%)',
                   }} />
            )}
            {edgeSeg.right && (
              <div className="absolute right-0 w-[6px] rounded-l-full animate-pulse"
                   style={{
                     top: `${edgeSeg.right.top}px`,
                     height: `${edgeSeg.right.height}px`,
                     boxShadow: '0 0 18px rgba(16,185,129,0.75), 0 0 32px rgba(16,185,129,0.45)',
                     background:'linear-gradient(180deg, rgba(16,185,129,0.95) 0%, rgba(16,185,129,0.6) 50%, rgba(16,185,129,0.95) 100%)',
                   }} />
            )}
            {edgeSeg.top && (
              <div className="absolute top-0 h-[6px] rounded-b-full animate-pulse"
                   style={{
                     left: `${edgeSeg.top.left}px`,
                     width: `${edgeSeg.top.width}px`,
                     boxShadow: '0 0 18px rgba(16,185,129,0.75), 0 0 32px rgba(16,185,129,0.45)',
                     background:'linear-gradient(90deg, rgba(16,185,129,0.95) 0%, rgba(16,185,129,0.6) 50%, rgba(16,185,129,0.95) 100%)',
                   }} />
            )}
            {edgeSeg.bottom && (
              <div className="absolute bottom-0 h-[6px] rounded-t-full animate-pulse"
                   style={{
                     left: `${edgeSeg.bottom.left}px`,
                     width: `${edgeSeg.bottom.width}px`,
                     boxShadow: '0 0 18px rgba(16,185,129,0.75), 0 0 32px rgba(16,185,129,0.45)',
                     background:'linear-gradient(90deg, rgba(16,185,129,0.95) 0%, rgba(16,185,129,0.6) 50%, rgba(16,185,129,0.95) 100%)',
                   }} />
            )}
          </div>
        </div>
      </SortableContext>
    </DndContext>
  );
}
