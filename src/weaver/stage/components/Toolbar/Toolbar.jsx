import { useState, useRef, useEffect } from 'react';
import ToolButton from './ToolButton';
import {
  ZoomIn, ZoomOut, RefreshCw, Trash, XCircle, Lock,
  Unlock, ChevronDown, GalleryHorizontalEnd, GalleryVerticalEnd, Maximize
} from 'lucide-react';
import { BsCardText } from "react-icons/bs";
import { FaRegImages } from "react-icons/fa";
import { ActionTypes, InteractionTypes, InteractionStatus, logger } from '@/weaver/toolkit/utils/logger/logger';

const Toolbar = ({
  selectedNodes,
  onLockNodes,
  onUnlockNodes,
  onClearAll,
  onDeleteNode,
  onDeleteSlides,
  networkRef,
  layoutMode,
  setLayoutMode,
  setNodePositions,
}) => {
  const [deleteMenuOpen, setDeleteMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setDeleteMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasSlideSelected = () => {
    const saved = localStorage.getItem('selectedSlides');
    if (!saved) return false;
    try {
      const arr = JSON.parse(saved);
      return Array.isArray(arr) && arr.length > 0;
    } catch {
      return false;
    }
  };

  const hasStorypointSelected = () => {
    const direct = networkRef.current?.getSelectedNodes?.() || [];
    return direct.some((nodeId) => {
      const node = networkRef.current.body.data.nodes.get(nodeId);
      return node && node.group === 'storypoint';
    });
  };

  const getSelectionSnapshot = () => {
    const ids = networkRef.current?.getSelectedNodes?.() || [];
    const ds = networkRef.current?.body?.data?.nodes;
    const storypoints = [];
    const slides = [];

    ids.forEach((id) => {
      const n = ds?.get?.(id);
      if (!n) return;
      if (n.group === 'storypoint') {
        storypoints.push({
          storypoint_id: n.id,
          label: typeof n.label === 'string' ? n.label : undefined,
        });
      } else if (n.group === 'slide') {
        const spId = n.parentId || (typeof n.id === 'string' ? n.id.split('_')[0] : null);
        const slideId = n.slideData?.id || (typeof n.id === 'string' ? n.id.split('_').slice(1).join('_') : null);
        slides.push({
          storypoint_id: spId || undefined,
          slide_id: slideId || undefined,
          vis_id: n.id,
          title: typeof n.label === 'string' ? n.label : undefined,
        });
      }
    });

    return {
      storypoints,
      slides,
      counts: { storypoints: storypoints.length, slides: slides.length },
    };
  };

  const handleLayoutToggle = async () => {
    const prev = layoutMode;
    const next = layoutMode === 'horizontal' ? 'vertical' : 'horizontal';
    setLayoutMode(next);
    setNodePositions({});
    await logger.logInteraction(ActionTypes.VISUALIZATION, {
      interaction_type: InteractionTypes.GRAPH_LAYOUT_TOGGLE,
      component: 'Toolbar',
      status: InteractionStatus.SUCCESS,
      input_data: { prevLayout: prev, newLayout: next },
    });
  };

  const handleResetView = async () => {
    const beforeScale = networkRef.current?.getScale?.() ?? null;
    setLayoutMode('horizontal');
    setNodePositions({});
    localStorage.removeItem('nodePositions');
    await logger.logInteraction(ActionTypes.VISUALIZATION, {
      interaction_type: InteractionTypes.GRAPH_RESET_VIEW,
      component: 'Toolbar',
      status: InteractionStatus.SUCCESS,
      metadata: { beforeScale },
    });
  };

  const handleZoomIn = async () => {
    const before = networkRef.current?.getScale?.() ?? null;
    const after = before ? before * 1.2 : null;
    networkRef.current?.moveTo({ scale: after, animation: true });
    await logger.logInteraction(ActionTypes.VISUALIZATION, {
      interaction_type: InteractionTypes.GRAPH_ZOOM_ADJUST,
      component: 'Toolbar',
      status: InteractionStatus.SUCCESS,
      input_data: { direction: 'in' },
      metadata: { beforeScale: before, afterScale: after },
    });
  };

  const handleZoomOut = async () => {
    const before = networkRef.current?.getScale?.() ?? null;
    const after = before ? before * 0.8 : null;
    networkRef.current?.moveTo({ scale: after, animation: true });
    await logger.logInteraction(ActionTypes.VISUALIZATION, {
      interaction_type: InteractionTypes.GRAPH_ZOOM_ADJUST,
      component: 'Toolbar',
      status: InteractionStatus.SUCCESS,
      input_data: { direction: 'out' },
      metadata: { beforeScale: before, afterScale: after },
    });
  };

  const handleFitView = async () => {
    const before = networkRef.current?.getScale?.() ?? null;
    networkRef.current?.fit({ animation: true });
    await logger.logInteraction(ActionTypes.VISUALIZATION, {
      interaction_type: InteractionTypes.GRAPH_ZOOM_ADJUST,
      component: 'Toolbar',
      status: InteractionStatus.SUCCESS,
      input_data: { action: 'fit' },
      metadata: { beforeScale: before },
    });
  };

  const buildByStorypoint = (visIds) => {
    const ds = networkRef.current?.body?.data?.nodes;
    const bySP = {};
    visIds.forEach((visId) => {
      const n = ds?.get?.(visId);
      const spId = n?.parentId ?? (typeof visId === 'string' ? visId.split('_')[0] : 'unknown');
      const slideId = n?.slideData?.id ?? (typeof visId === 'string' ? visId.split('_').slice(1).join('_') : undefined);
      if (!bySP[spId]) bySP[spId] = [];
      bySP[spId].push({ vis_id: visId, slide_id: slideId });
    });
    return bySP;
  };

  const handleLock = async () => {
    const affected = await onLockNodes();
    if (!affected?.length) return;
    await logger.logInteraction(ActionTypes.CONTENT, {
      interaction_type: InteractionTypes.SLIDE_LOCK,
      component: 'Toolbar',
      status: InteractionStatus.SUCCESS,
      input_data: { slide_vis_ids: affected },
      metadata: {
        total_locked: affected.length,
        by_storypoint: buildByStorypoint(affected),
      },
    });
  };

  const handleUnlock = async () => {
    const affected = await onUnlockNodes();
    if (!affected?.length) return;
    await logger.logInteraction(ActionTypes.CONTENT, {
      interaction_type: InteractionTypes.SLIDE_UNLOCK,
      component: 'Toolbar',
      status: InteractionStatus.SUCCESS,
      input_data: { slide_vis_ids: affected },
      metadata: {
        total_unlocked: affected.length,
        by_storypoint: buildByStorypoint(affected),
      },
    });
  };

  const handleDeleteStorypoint = async () => {
    const snap = getSelectionSnapshot();
    const onlySp = { ...snap, slides: [] };
    await logger.logInteraction(ActionTypes.DELETION, {
      interaction_type: InteractionTypes.GRAPH_DELETE_STORYPOINTS,
      component: 'Toolbar',
      status: InteractionStatus.SUCCESS,
      input_data: { scope: 'storypoint' },
      metadata: {
        counts: { storypoints: onlySp.storypoints.length, slides: 0 },
        storypoints: onlySp.storypoints,
      },
    });
    onDeleteNode();
  };

  const handleDeleteSlides = async () => {
    const snap = getSelectionSnapshot();
    const onlySlides = { ...snap, storypoints: [] };
    await logger.logInteraction(ActionTypes.DELETION, {
      interaction_type: InteractionTypes.GRAPH_DELETE_SLIDES,
      component: 'Toolbar',
      status: InteractionStatus.SUCCESS,
      input_data: { scope: 'slides' },
      metadata: {
        counts: { storypoints: 0, slides: onlySlides.slides.length },
        slides: onlySlides.slides,
      },
    });
    onDeleteSlides();
  };

  const handleClearAll = async () => {
    const ds = networkRef.current?.body?.data?.nodes;
    const all = Array.isArray(ds?.get?.()) ? ds.get() : [];
    const totals = {
      nodes_total: all.length,
      storypoints_total: all.filter(n => n.group === 'storypoint').length,
      slides_total: all.filter(n => n.group === 'slide').length,
    };

    await logger.logInteraction(ActionTypes.DELETION, {
      interaction_type: InteractionTypes.GRAPH_CANVAS_CLEAR,
      component: 'Toolbar',
      status: InteractionStatus.SUCCESS,
      input_data: { scope: 'clear_all' },
      metadata: totals,
    });

    onClearAll();
  };

  return (
    <div className="p-2 bg-white rounded-lg shadow-sm mb-4 flex items-center space-x-2 flex-wrap">
      <div className="relative" ref={menuRef}>
        <ToolButton
          icon={() => <div className="flex items-center"><Trash size={16} /><ChevronDown size={14} className="ml-1" /></div>}
          onClick={() => setDeleteMenuOpen((o) => !o)}
          tooltip="Delete"
        />
        {deleteMenuOpen && (
          <div className="origin-top-right absolute mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg z-10">
            <ToolButton
              icon={FaRegImages}
              text="Delete Storypoint"
              onClick={() => { setDeleteMenuOpen(false); handleDeleteStorypoint(); }}
              disabled={!hasStorypointSelected()}
              className={`w-full text-left px-3 py-2 text-sm flex items-center ${!hasStorypointSelected() ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'}`}
            />
            <ToolButton
              icon={BsCardText}
              text="Delete Selected Slide(s)"
              onClick={() => { setDeleteMenuOpen(false); handleDeleteSlides(); }}
              disabled={!hasSlideSelected()}
              className={`w-full text-left px-3 py-2 text-sm flex items-center ${!hasSlideSelected() ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'}`}
            />
            <ToolButton
              icon={XCircle}
              text="Clear All"
              onClick={() => { setDeleteMenuOpen(false); handleClearAll(); }}
              className="w-full text-left px-3 py-2 text-sm flex items-center text-red-600"
            />
          </div>
        )}
      </div>

      {selectedNodes.size > 0 && (
        <>
          <div className="h-6 w-px bg-gray-300 mx-2" />
          <ToolButton icon={Lock} size={16} onClick={handleLock} tooltip="Lock Selected" />
          <ToolButton icon={Unlock} size={16} onClick={handleUnlock} tooltip="Unlock Selected" />
        </>
      )}

      <div className="h-6 w-px bg-gray-300 mx-2" />
      <ToolButton icon={ZoomIn} size={16} onClick={handleZoomIn} tooltip="Zoom In" />
      <ToolButton icon={ZoomOut} size={16} onClick={handleZoomOut} tooltip="Zoom Out" />
      <div className="h-6 w-px bg-gray-300 mx-2" />
      <ToolButton icon={Maximize} size={16} onClick={handleFitView} tooltip="Fit View" />
      <ToolButton
        icon={layoutMode === 'horizontal' ? GalleryHorizontalEnd : GalleryVerticalEnd}
        size={16}
        tooltip={`Switch to ${layoutMode === 'horizontal' ? 'Vertical' : 'Horizontal'} Layout`}
        onClick={handleLayoutToggle}
      />
      <ToolButton icon={RefreshCw} size={16} tooltip="Reset View" onClick={handleResetView} />
    </div>
  );
};

export default Toolbar;
