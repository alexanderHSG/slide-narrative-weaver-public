import NavigationControls from '../NavigationControls/NavigationControls.jsx';
import { useRef, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import SortableGrid from './SortableGrid.jsx';
import handleGetNextSlides from '@/weaver/toolkit/utils/handleGetNextSlides.js';
import { useStoryPointEvaluations } from '@/weaver/threads/hooks/useStoryPointEvaluations';
import { Tooltip } from './Tooltip.jsx';
import { FaSpinner } from 'react-icons/fa';
import { logger, ActionTypes, InteractionTypes } from '@/weaver/toolkit/utils/logger/logger.js';
import { useGraphPersistence } from '@/weaver/threads/hooks/useGraphHooks/useGraphPersistence.ts';
import { useSessionMetrics } from '@/weaver/threads/hooks/useGraphHooks/useSessionMetrics.ts';
import { useEvaluationStyling } from '@/weaver/threads/hooks/useGraphHooks/useEvaluationStyling.ts';
import { useSlideRetrievePopover } from '@/weaver/threads/hooks/useGraphHooks/useSlideRetrievePopover.ts';
import { networkOptions } from '@/weaver/toolkit/utils/graph/networkOptions.js';
import { populateGraphDatasets } from '@/weaver/toolkit/utils/graph/populateGraphDatasets.ts';
import { attachNetworkEvents } from '@/weaver/toolkit/utils/graph/attachNetworkEvents.ts';
import { useAnchorRecalc } from '@/weaver/threads/hooks/useGraphHooks/useAnchorRecalc.ts';
import ImageEnlarge from './ImageEnlarge.jsx';
import { useAutoReevaluateSP } from '@/weaver/threads/hooks/useGraphHooks/useAutoReevaluateSP.ts';
import { useUser } from '../UserAccessWrapper/UserAccessWrapper';
import { fetchSlideDataUrl } from '@/weaver/signals/lib/images/fetchSlideDataUrl';

const GraphVisualization = ({
  storyPoints,
  setStoryPoints,
  setSelectedNodes,
  selectedNodes,
  onNodeEdit,
  lockedNodes = new Set(),
  networkRef,
  driver,
  layoutMode,
  nodePositions,
  setNodePositions,
}) => {
  const { isExp, prototype } = useUser?.() || {};
  const isI2 = isExp && prototype === 'I2';

  const visRef = useRef(null);
  const nodesRef = useRef(null);
  const edgesRef = useRef(null);

  const [enlargedObjectId, setEnlargedObjectId] = useState(null);

  const [modalStorypointId, setModalStorypointId] = useState(null);
  const [localSlides, setLocalSlides] = useState([]);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const showToast = (msg, ms = 2000) => {
    setToastMsg(msg);
    window.clearTimeout((showToast)._t);
    (showToast)._t = window.setTimeout(() => setToastMsg(null), ms);
  };
  const safeLockedNodes = (() => {
    if (lockedNodes instanceof Set) return lockedNodes;
    if (Array.isArray(lockedNodes)) return new Set(lockedNodes);
    return new Set();
  })();

  const selectedRef = useRef(new Set());
  const {
    slideEvaluationsMap,
    slideEvaluationsLoading,
    evaluatingSPId,
    reEvaluateSP,
  } = useStoryPointEvaluations(storyPoints);

  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredPos, setHoveredPos] = useState({ x: 0, y: 0 });
  const { popupInfo, openPopoverForNode, closePopover, setPopupInfo } = useSlideRetrievePopover(networkRef);
  const popoverRef = useRef(null);

  useAnchorRecalc({
    networkRef,
    hoveredNode,
    setHoveredPos
  });

  useGraphPersistence({
    storyPoints,
    setStoryPoints,
    selectedNodes,
    setSelectedNodes,
    nodePositions,
    setNodePositions,
  });

  useEvaluationStyling({
    nodesRef,
    edgesRef,
    networkRef,
    storyPoints,
    slideEvaluationsMap,
    slideEvaluationsLoading,
    evaluatingSPId,
  });

  useSessionMetrics(storyPoints);
  useAutoReevaluateSP(storyPoints, reEvaluateSP);

  const buildExistingSlideKeys = (sps) => {
    const set = new Set();
    for (const sp of sps || []) {
      const spId = sp?.id;
      if (!spId) continue;
      for (const s of sp?.slides || []) {
        set.add(`${spId}_${s.id}`);
      }
    }
    return set;
  };

  const [selectionOrder, setSelectionOrder] = useState(() => {
    try {
      const fromLS = JSON.parse(localStorage.getItem('selectedSlidesOrder') || '[]');
      return Array.isArray(fromLS) ? fromLS : [];
    } catch {
      return [];
    }
  });

  const selectionOrderRef = useRef(selectionOrder);

  useEffect(() => { 
    selectionOrderRef.current = selectionOrder; 
  }, [selectionOrder]);

  useEffect(() => {
    try { localStorage.setItem('selectedSlidesOrder', JSON.stringify(selectionOrder)); } catch {}
    try { networkRef.current?.redraw?.(); } catch {}
  }, [selectionOrder]);

  useEffect(() => {
    const allowed = buildExistingSlideKeys(storyPoints);
    setSelectedNodes((prev) => {
      let changed = false;
      const next = new Set();
      for (const id of prev) {
        if (allowed.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [storyPoints, setSelectedNodes]);

  useEffect(() => {
    selectedRef.current = new Set(selectedNodes);
    networkRef.current?.redraw?.();
    try {
      localStorage.setItem('selectedSlides', JSON.stringify(Array.from(selectedNodes)));
    } catch {}
  }, [selectedNodes]);

  useEffect(() => {
    setSelectionOrder((prev) => {
      const next = prev.filter((id) => selectedNodes.has(id));

      for (const id of selectedNodes) {
        if (!next.includes(id)) next.push(id);
      }
      return next;
    });
  }, [selectedNodes]);

  useEffect(() => {
    if (modalStorypointId) {
      const spSlides = storyPoints.find(sp => sp.id === modalStorypointId)?.slides ?? [];
      setLocalSlides(spSlides);
    } else {
      setLocalSlides([]);
    }
  }, [modalStorypointId, storyPoints]);

  useEffect(() => {
    if (!popupInfo) return;
    if (modalStorypointId || enlargedObjectId) { closePopover(); return; }
    const onPointerDown = (e) => {
      if (popoverRef.current && popoverRef.current.contains(e.target)) return;
      closePopover();
    };
    const onKeyDown = (e) => { if (e.key === 'Escape') closePopover(); };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    const n = networkRef.current;
    const onNetClick = () => closePopover();
    n?.on('click', onNetClick);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
      n?.off('click', onNetClick);
    };
  }, [popupInfo, modalStorypointId, enlargedObjectId, closePopover]);
  

  useEffect(() => {
    if (!networkRef.current || !nodesRef.current) return;
    nodesRef.current.get().forEach(node => {
      if (node.group !== 'slide') return;
      const isLocked = safeLockedNodes.has(node.id);
      nodesRef.current.update({
        id: node.id,
        label: isLocked ? '🔒': ' ',
        locked: isLocked,
      });
    });
    networkRef.current.redraw();
  }, [safeLockedNodes]);


  const handleSlideDoubleClick = async (nodeId, node) => {
    setHoveredNode(null);
    await logger.logSlideView(nodeId, {
      storypoint_id: node.parentId,
      slide_index: node.slideData.slide_number,
      ui_action: 'double_click',
      enlarged: true
    });
    setEnlargedObjectId(node.slideData.object_id);
  };

  const getStorypointIdAtEvent = (e) => {
    try {
      const container = networkRef.current?.body?.container ?? e.currentTarget;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const nodeIdAtCursor = networkRef.current?.getNodeAt?.({ x, y });
      if (!nodeIdAtCursor) return null;
      const node = nodesRef.current?.get?.(nodeIdAtCursor);
      if (!node) return null;
      if (node.group === 'storypoint') return nodeIdAtCursor;
      if (node.group === 'slide' && node.parentId) return node.parentId;
      return null;
    } catch {
      return null;
    }
  };
    

  useEffect(() => {
    let cancelled = false;
    if (!visRef.current) return;

    (async () => {
      const { Network } = await import('vis-network/standalone');
      const { DataSet } = await import('vis-data');

      if (cancelled || !visRef.current || networkRef.current) return;

      nodesRef.current = new DataSet();
      edgesRef.current = new DataSet();

      populateGraphDatasets({
        storyPoints,
        layoutMode,
        nodePositions,
        slideEvaluationsMap,
        safeLockedNodes,
        nodes: nodesRef.current,
        edges: edgesRef.current,
      });

      const network = new Network(
        visRef.current,
        { nodes: nodesRef.current, edges: edgesRef.current },
        networkOptions
      );
      networkRef.current = network;

      attachNetworkEvents({
        network,
        nodesRef,
        setNodePositions,
        setSelectedNodes,
        setModalStorypointId,
        openPopoverForNode,
        setHoveredNode,
        setHoveredPos,
        selectedRef,
        onNodeEdit,
        onSlideDoubleClick: handleSlideDoubleClick,
      });

      const BADGE_CORNER = 'top-left'; // options: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
      const BADGE_R = 12;
      const BADGE_OFFSET = -14;

      const drawOrderBadges = (ctx) => {
        const order = selectionOrderRef.current;
        if (!order || order.length === 0) return;

        for (let i = 0; i < order.length; i++) {
          const nodeId = order[i];
          const node = nodesRef.current?.get?.(nodeId);
          if (!node) continue;
          const box = network.getBoundingBox(nodeId);
          if (!box) continue;

          let x; let y;
          switch (BADGE_CORNER) {
            case 'top-right':
              x = box.right - BADGE_R - BADGE_OFFSET; y = box.top + BADGE_R + BADGE_OFFSET; break;
            case 'bottom-left':
              x = box.left + BADGE_R + BADGE_OFFSET; y = box.bottom - BADGE_R - BADGE_OFFSET; break;
            case 'bottom-right':
              x = box.right - BADGE_R - BADGE_OFFSET; y = box.bottom - BADGE_R - BADGE_OFFSET; break;
            case 'top-left':
            default:
              x = box.left + BADGE_R + BADGE_OFFSET; y = box.top + BADGE_R + BADGE_OFFSET; break;
          }

          ctx.beginPath();
          ctx.arc(x, y, BADGE_R, 0, Math.PI * 2);
          ctx.fillStyle = '#22c55e'; // green-500
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(i + 1), x, y);
        }
      };

      network.on('afterDrawing', drawOrderBadges);

      const slideNodes = nodesRef.current.get().filter(n => n.group === 'slide' && n?.slideData?.object_id);
      for (const n of slideNodes) {
        try {
          const dataUrl = await fetchSlideDataUrl(n.slideData.object_id);
          if (!dataUrl) continue;
          nodesRef.current.update({
            id: n.id,
            image: dataUrl,
            shape: 'image',
            shapeProperties: { useBorderWithImage: true, useImageSize: false },
          });
          networkRef.current?.redraw?.();
        } catch {}
        if (cancelled) break;
      }
    })();

    return () => {
      cancelled = true;
      try { networkRef.current?.destroy(); } catch {}
      networkRef.current = null;
    };
  }, [storyPoints, layoutMode]);

  const handleCloseModal = () => {
    setStoryPoints(prev =>
      prev.map(sp =>
        sp.id === modalStorypointId ? { ...sp, slides: localSlides } : sp
      )
    );
    setModalStorypointId(null);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;

    const slide = JSON.parse(raw);
    let storypointId = getStorypointIdAtEvent(e);
    if (!storypointId) {
      const selected = networkRef.current?.getSelectedNodes?.() || [];
      storypointId = selected.find(id => nodesRef.current?.get?.(id)?.group === 'storypoint') || null;
    }
    if (!storypointId && storyPoints?.length) {
      storypointId = storyPoints[storyPoints.length - 1].id;
    }
    if (!storypointId) {
      showToast('Drop onto a Story Point to pin the slide');
      return;
    }

    const slideId = `${storypointId}_${slide.id}`;
    if (nodesRef.current.get(slideId)) {
      showToast('This slide is already in that Story Point');
      return;
    }

    let dataUrl = null;
    try { dataUrl = await fetchSlideDataUrl(slide.object_id); } catch {}

    nodesRef.current.add({
      id: slideId,
      group: 'slide',
      parentId: storypointId,
      shape: 'image',
      image: dataUrl || undefined,
      size: 45,
      color: {
        background: '#F3F4F6',
        border: '#D1D5DB',
        highlight: { background: '#E5E7EB', border: '#9CA3AF' },
      },
      shapeProperties: { useBorderWithImage: true, useImageSize: false },
      slideData: {
        object_id: slide.object_id,
        slide_number: slide.slide_number,
      },
    });

    setStoryPoints(prev =>
      prev.map(sp => {
        if (sp.id === storypointId) {
          const newSlides = [...(sp.slides || [])];
          const index = newSlides.length;
          const content = slide.content || 'No content';
          const exists = newSlides.some(s => s.id === slide.id);
          if (!exists) {
            newSlides.push({
              id: slide.id,
              content,
              object_id: slide.object_id,
              visible: true,
              locked: false,
              similarity: slide.similarity || 0,
              percentage: Math.round((slide.similarity || 0) * 100),
              title: slide.title,
            });
          }
          const newFields = { [`slide${index + 1}Content`]: content };
          return { ...sp, slides: newSlides, ...newFields };
        }
        return sp;
      })
    );

    edgesRef.current.add({
      id: `edge_${slideId}_${storypointId}`,
      from: slideId,
      to: storypointId,
      arrows: 'to',
      label: `${Math.round((slide.similarity || 0) * 100)}%`,
      font: { color: '#2E7D32', size: 14 },
      smooth: { type: 'curvedCW', roundness: 0.2 },
      labelPosition: 1,
    });

    networkRef.current.redraw();
  };

  return (
    <div
      className="relative w-full h-[calc(100vh-200px)] border-2 border-gray-300 rounded-lg overflow-hidden"
      onDrop={handleDrop}
      onDragOver={e => {
        e.preventDefault();
        try { e.dataTransfer.dropEffect = 'copy'; } catch {}
        const spId = getStorypointIdAtEvent(e);
        if (spId) {
          try { networkRef.current?.selectNodes?.([spId], false); } catch {}
        } else {
          try { networkRef.current?.unselectAll?.(); } catch {}
        }
      }}
    >
      {isLoadingNext && (
        <div className="fixed inset-0 bg-white/90 flex items-center justify-center z-50">
          <FaSpinner className="w-20 h-20 animate-spin text-green-600" />
        </div>
      )}

      <div ref={visRef} className="absolute inset-0 bg-white" style={{ minHeight: '600px' }} />

      {hoveredNode && hoveredNode.group === "slide" && (
        <Tooltip
          content={hoveredNode?.slideData?.issues || "No AI feedback for this slide"}
          customPosition={{ x: hoveredPos.x, y: hoveredPos.y }}
        >
          <span />
        </Tooltip>
      )}
      <AnimatePresence>
        {popupInfo && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute z-50 bg-white border border-gray-200 rounded-full shadow-lg p-2"
            style={{
              left: popupInfo.x - 120,
              top: popupInfo.y - 120,
              transform: 'translate(-50%, calc(-100% - 12px))',
              pointerEvents: 'auto'
            }}
          >
            <button
              type='button'
              className="retrieve-alt-btn flex items-center text-green-700 px-2 py-1 w-[220px] rounded-full transition text-sm"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                closePopover();
                setIsLoadingNext(true);
                try {
                  await handleGetNextSlides(
                    new Set([popupInfo.nodeId]),
                    networkRef,
                    storyPoints,
                    setStoryPoints,
                    setIsLoadingNext,
                    driver,
                    lockedNodes,
                    reEvaluateSP
                  );
                } finally {
                  setIsLoadingNext(false);
                }
              }}
            >
              <Sparkles className="mr-1" size={16} />
              Retrieve alternative slides
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <NavigationControls networkRef={networkRef} />

      {modalStorypointId && (
        <div className="fixed inset-0 flex items-center
          justify-center bg-black bg-opacity-40 z-50"
        >
          <div className="bg-white rounded-xl shadow-2xl
            max-w-5xl w-full flex flex-col max-h-[90vh]
            overflow-hidden"
          >
            <div className='flex
              items-center
              justify-between
              bg-green-50
              px-6
              py-6
              rounded-t-xl
              border-b
              border-green-100'
            >
              <h2 className="mt-2 text-2xl font-bold text-green-900 leading-none">
                All Slides ({localSlides.length}) - Drag to Reorder
              </h2>
              <button
                onClick={handleCloseModal}
                className="mt-2 p-2 hover:bg-green-100 rounded-full transition-colors"
              >
                <X className="w-8 h-8 text-green-900" />
              </button>

            </div>
            <div className='p-6 flex-1 overflow-y-auto overflow-x-hidden'>
              <SortableGrid
                slides={localSlides}
                setSlides={setLocalSlides}
                selectedSlides={selectedNodes}
                selectionOrder={selectionOrder}
                toggleSlide={(slideKey) => {
                  setSelectedNodes(prev => {
                    const next = new Set(prev);
                    if (next.has(slideKey)) next.delete(slideKey);
                    else next.add(slideKey);
                    return next;
                  })
                }}
                slideEvaluationsMap={slideEvaluationsMap}
                storyPointId={modalStorypointId}
                onEnlargeImage={(objectId) => setEnlargedObjectId(objectId)}
              />
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {enlargedObjectId && (
          <ImageEnlarge
            objectId={enlargedObjectId}
            isOpen={!!enlargedObjectId}
            onClose={() => setEnlargedObjectId(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed inset-x-0 bottom-4 z-[9999] flex justify-center pointer-events-none"
            role="status"
            aria-live="polite"
          >
            <div className="pointer-events-auto bg-white border border-amber-300 text-amber-800 rounded-xl px-4 py-2 shadow-xl">
              {toastMsg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GraphVisualization;
