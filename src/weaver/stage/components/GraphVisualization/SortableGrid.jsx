import {
  DndContext,
  closestCenter,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Tooltip } from "./Tooltip";
import { useEffect, useRef } from "react";
import { drawSlideToCanvas } from "@/weaver/signals/lib/images/drawSlideToCanvas";
import { logger } from "@/weaver/toolkit/utils/logger/logger";

function CanvasSlide({ objectId }) {
  const canvasRef = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const paint = async () => {
      const c = canvasRef.current;
      const box = boxRef.current;
      if (!c || !box) return;

      const w = Math.max(1, Math.round(box.clientWidth));
      const h = Math.max(1, Math.round((w * 9) / 16));

      const dpr = Math.max(1, window.devicePixelRatio || 1);
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;

      try {
        await drawSlideToCanvas(objectId, c, "contain");
      } catch {
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.fillStyle = "#9CA3AF";
          ctx.font = `${12 * dpr}px system-ui`;
          ctx.fillText("No preview", 16 * dpr, 24 * dpr);
        }
      }
      if (cancelled) return;
    };

    paint();
    const ro = new ResizeObserver(() => paint());
    if (boxRef.current) ro.observe(boxRef.current);

    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, [objectId]);

  return (
    <div ref={boxRef} className="relative w-full">
      <div style={{ paddingTop: "56.25%" }} />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block rounded-lg"
        style={{ imageRendering: "auto", pointerEvents: "none" }}
        role="img"
        aria-label="Slide Thumbnail"
        draggable={false}
      />
    </div>
  );
}

const SortableItem = ({ 
  slide, 
  className, 
  onEnlarge,
  slideEval,
  selected,
  onSelect,
  slideKey
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slideKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${className || ""}`}
    >
      {slideEval?.score != null && (
        <Tooltip content={slideEval?.issues || "No AI feedback for this slide"}>
          <div
            className="absolute left-2 top-3 bg-white bg-opacity-90 px-2 py-0.5 rounded text-green-900 text-xs font-bold border border-green-300 shadow-sm z-30"
            style={{ cursor: 'help' }}
          >
            {slideEval.score}/10
          </div>
        </Tooltip>
      )}

      <div
        {...attributes}
        {...listeners}
        className="absolute top-8 right-2 z-20 p-1 cursor-grab opacity-0 group-hover:opacity-100 transition"
        title="Drag to move"
        style={{ background: "rgba(255,255,255,0.7)", borderRadius: "50%" }}
        onClick={e => e.stopPropagation()}
      >
        <svg width="18" height="18" fill="gray"><circle cx="9" cy="9" r="8"/></svg>
      </div>

      <div
        className="absolute top-36 right-2 z-20 cursor-poiner opacity-0 group-hover:opacity-100 transition"
        style={{ width: 26, height: 26, borderRadius: "50%" }}
        onClick={e => { e.stopPropagation(); onSelect(); }}
        title="Select"
      >
        <div className={`
          w-full h-full flex items-center justify-center rounded-full bg-white/80
          ${selected
            ? "border-2 border-green-400 text-green-800"
            : "text-gray-500 border border-gray-300"}
        `}>
          {selected 
            ? <svg width="14" height="16" fill="currentColor" aria-hidden="true">
                <polyline points="2,8 6,12 12,4" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
            : <div className="w-6 h-6 border-2  border-gray-400 rounded-full" />
          }
        </div>
      </div>

      <div
        className={`
          rounded-lg
          object-contain
          w-full
          transition-transform duration-200 hover:scale-105
          cursor-pointer
          border-dashed
          border-4
          ${selected ? `border-gray-500` : "border-transparent"}
        `}
        style={{ pointerEvents: "auto" }}
        onClick={onEnlarge}
      >
        <CanvasSlide objectId={slide.object_id} />
      </div>

      <div className="text-md text-center line-clamp-2 text-gray-600 mt-2 max-w-full">
        {slide.title?.slice(0, 60)}
      </div>
    </div>
  );
};

const SortableGrid = ({ 
  slides, 
  setSlides, 
  onEnlargeImage,
  slideEvaluationsMap, 
  storyPointId, 
  selectedSlides = new Set(), 
  toggleSlide,
}) => {
  
  const getSlideKey = (slide) => `${storyPointId}_${slide.id}`;

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;

    setSlides((prev) => {
      const oldIndex = prev.findIndex(s => getSlideKey(s) === active.id);
      const newIndex = prev.findIndex(s => getSlideKey(s) === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const slideKeys = slides.map(getSlideKey);

  return (
    <div className="overflow-y-auto overflow-x-hidden mx-auto -my-6">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={slideKeys} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 gap-7 px-2 py-2 relative overflow-hidden">
            {slides.map((slide, index) => {
              const slideKey = `${storyPointId}_${slide.id}`;
              const slideEval = slideEvaluationsMap?.[storyPointId]?.[slideKey];

              const onEnlarge = async (e) => {
                e?.stopPropagation?.();
                await logger.logSlideView(slide.id, {
                  storypoint_id: storyPointId,
                  slide_index: index + 1,
                  ui_action: 'enlarge_click',
                  enlarged: true,
                });
                onEnlargeImage?.(slide.object_id);
              };

              return (
                <div
                  key={slideKey}
                  className={`${index >= 6 && index < 9 ? 'mt-16' : ''} transition-all duration-200`}
                >
                  <SortableItem 
                    slide={slide} 
                    selected={selectedSlides.has(slideKey)}
                    onSelect={() => toggleSlide(slideKey)}
                    onEnlarge={onEnlarge}
                    slideEval={slideEval}
                    slideKey={slideKey}
                  />
                </div>
              )
            })}

            {slides.length > 6 && (
              <div
                className="absolute left-0 right-0 flex items-center
                justify-center -my-3
                rounded-lg"
                style={{
                  top: `calc((100% / ${Math.ceil(slides.length / 3)}) * 2)`,
                  zIndex: 10,
                }}
              >
                <div className="flex-grow h-2 bg-gradient-to-r from-transparent via-green-600 to-transparent" />
                <span className="
                        mx-3 
                        px-4 
                        py-1 
                        bg-green-700 
                        rounded-full 
                        text-[10px] 
                        uppercase 
                        font-semibold 
                        tracking-wider 
                        text-white 
                        shadow
                        border border-gray-200
                      "
                >
                  Only slides above are visible on the canvas
                </span>
                <div className="flex-grow h-2 bg-gradient-to-l from-transparent via-green-600 to-transparent" />
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default SortableGrid;
