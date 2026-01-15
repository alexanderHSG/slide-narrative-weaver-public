import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import GraphVisualization from '../GraphVisualization/GraphVisualization';
import StoryPointEditDialog from '../StoryPointEditDialog/StoryPointEditDialog';
import { useHistoryManager } from '@/weaver/threads/hooks/useHistoryManager';
import { useStoryPointDialogHandlers } from '@/weaver/threads/hooks/useStoryPointDialogHandlers/useStoryPointDialogHandlers';

const STORAGE = {
  STEP: 'tutorial.step',
  SLIDES: 'tutorial.slidesLoaded',
  SKIPPED: 'tutorial.skipped',
};

const LS_KEYS = {
  GRAPH_DONE: 'graphTutorialCompleted',
  GRAPH_DISMISSED: 'graphTutorialOfferDismissed',
};

const persistStep = (setter) => (nextIndex) => {
  setter(nextIndex);
  try { sessionStorage.setItem(STORAGE.STEP, String(nextIndex)); } catch {}
};

const INITIAL_SP = [
  {
    id: 'SP_TUT',
    shortTitle: 'Tutorial Story Point',
    description:
      'Start by clicking this Story Point to reveal the “Retrieve alternative slides” action.',
    slides: [],
  },
];

const GraphTutorial = ({ onExit, driver }) => {
  const [storyPoints, setStoryPoints] = useState(INITIAL_SP);
  const [selectedNodes, setSelectedNodes] = useState(new Set());
  const networkRef = useRef(null);
  const lockedNodes = useMemo(() => new Set(), []);
  const setIsLoading = () => {};
  const layoutMode = 'horizontal';
  const nodePositions = {};
  const setNodePositions = () => {};
  const { addToHistory } = useHistoryManager(networkRef, setStoryPoints);
  const [editingSP, setEditingSP] = useState(null);
  const onNodeEdit = useCallback((spId) => setEditingSP(spId), []);
  const stageRef = useRef(null);
  const [anchors, setAnchors] = useState({
    sp: null,
    slides: {},
    edge: null,
  });
  const { handleSave, handleRegenerate } = useStoryPointDialogHandlers({
    storyPoints,
    setStoryPoints,
    setEditingStoryPoint: setEditingSP,
    addToHistory,
    sharedNetworkRef: networkRef,
    lockedNodes,
  });

  const [run, setRun] = useState(false);
  const [joyIndex, _setJoyIndex] = useState(0);
  const setStep = persistStep(_setJoyIndex);

  const firstSpId = storyPoints[0]?.id;
  const firstSlide = storyPoints[0]?.slides?.[0] || null;
  const firstSlideKey = firstSpId && firstSlide ? `${firstSpId}_${firstSlide.id}` : null;
  const firstEdgeId = firstSlideKey && firstSpId ? `edge_${firstSlideKey}_${firstSpId}` : null;

  const hasRetrieveButton = useCallback(
    () => !!document.querySelector('.retrieve-alt-btn'),
    []
  );

  const markFinished = useCallback(() => {
    try { localStorage.setItem(LS_KEYS.GRAPH_DONE, 'true'); } catch {}
    window.dispatchEvent(new Event('graphTutorial:finished'));
  }, []);

  const markDismissed = useCallback(() => {
    try { localStorage.setItem(LS_KEYS.GRAPH_DISMISSED, '1'); } catch {}
    window.dispatchEvent(new Event('graphTutorial:dismissed'));
  }, []);

  const computeAnchors = useCallback(() => {
    const net = networkRef.current;
    const stageEl = stageRef.current;
    if (!net || !stageEl || !firstSpId) return false;

    const slideIds = (storyPoints[0].slides || []).map((s) => `${firstSpId}_${s.id}`);
    const nodeIds = [firstSpId, ...slideIds];

    const positions = net.getPositions(nodeIds);
    if (!positions[firstSpId]) return false;

    const containerEl = net.body?.container;
    if (!containerEl) return false;

    const contRect = containerEl.getBoundingClientRect();
    const stageRect = stageEl.getBoundingClientRect();
    const offsetX = contRect.left - stageRect.left;
    const offsetY = contRect.top - stageRect.top;

    const bodyNodes = net.body?.nodes || {};
    const spObj = bodyNodes[firstSpId];
    if (!spObj?.shape?.boundingBox) return false;

    const bbSP = spObj.shape.boundingBox;
    const tlSP = net.canvasToDOM({ x: bbSP.left,  y: bbSP.top });
    const brSP = net.canvasToDOM({ x: bbSP.right, y: bbSP.bottom });

    const spBox = {
      left: Math.round(tlSP.x + offsetX),
      top: Math.round(tlSP.y + offsetY),
      width: Math.round((brSP.x - tlSP.x) + 2),
      height: Math.round((brSP.y - tlSP.y) + 2),
      cls: `anchor-sp_${firstSpId}`,
    };

    const slidesBoxes = {};
    for (const sid of slideIds) {
      const nodeObj = bodyNodes[sid];
      if (!nodeObj?.shape?.boundingBox || !positions[sid]) continue;
      const bb = nodeObj.shape.boundingBox;
      const tl = net.canvasToDOM({ x: bb.left,  y: bb.top });
      const br = net.canvasToDOM({ x: bb.right, y: bb.bottom });
      slidesBoxes[sid] = {
        left: Math.round(tl.x + offsetX),
        top: Math.round(tl.y + offsetY),
        width: Math.round((br.x - tl.x) + 2),
        height: Math.round((br.y - tl.y) + 2),
        cls: `anchor-slide-${sid}`,
      };
    }

    let edgeBox = null;
    if (firstSlideKey && positions[firstSlideKey]) {
      const a = positions[firstSpId];
      const b = positions[firstSlideKey];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const midDom = net.canvasToDOM(mid);
      const W = 160;
      const H = 54;
      edgeBox = {
        left: Math.round(midDom.x + offsetX - W / 2),
        top: Math.round(midDom.y + offsetY - H / 2),
        width: W,
        height: H,
        cls: `anchor-edge-${firstEdgeId || 'first-edge'}`,
      };
    }

    setAnchors({ sp: spBox, slides: slidesBoxes, edge: edgeBox });
    return true;
  }, [firstSpId, firstSlideKey, firstEdgeId, storyPoints]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE.STEP);
      const slidesLoaded = sessionStorage.getItem(STORAGE.SLIDES) === '1';
      const skipped = sessionStorage.getItem(STORAGE.SKIPPED) === '1';
      if (skipped) return;
      if (saved != null) {
        let s = Number(saved);
        if (s >= 3 && !slidesLoaded) s = 2;
        setStep(s);
        setRun(true);
      }
    } catch {}

    let tries = 0;
    const poll = setInterval(() => {
      const ok = computeAnchors();
      if (ok || tries > 60) {
        clearInterval(poll);
        if (ok) {
          const saved = sessionStorage.getItem(STORAGE.STEP);
          if (saved == null) {
            setStep(0);
            setRun(true);
          }
        }
      }
      tries += 1;
    }, 120);

    const attachListeners = () => {
      const net = networkRef.current;
      if (!net) return;
      const recalc = () => computeAnchors();
      net.on('zoom', recalc);
      net.on('dragEnd', recalc);
      net.on('resize', recalc);
    };
    const lp = setInterval(() => {
      if (networkRef.current) {
        attachListeners();
        clearInterval(lp);
      }
    }, 120);

    return () => {
      clearInterval(poll);
      clearInterval(lp);
      const net = networkRef.current;
      if (net) {
        net.off('zoom');
        net.off('dragEnd');
        net.off('resize');
      }
    };
  }, [computeAnchors, setStep]);

  useEffect(() => {
    if (joyIndex !== 1) return;
    let obs;
    const checkAndAdvance = () => {
      if (hasRetrieveButton()) setStep(2);
    };
    checkAndAdvance();
    if ('MutationObserver' in window) {
      obs = new MutationObserver(checkAndAdvance);
      obs.observe(document.body, { childList: true, subtree: true });
    } else {
      const i = setInterval(checkAndAdvance, 200);
      return () => clearInterval(i);
    }
    return () => obs && obs.disconnect();
  }, [joyIndex, hasRetrieveButton, setStep]);

  useEffect(() => {
    const haveSlides = storyPoints[0]?.slides?.length > 0;
    if (haveSlides) {
      try { sessionStorage.setItem(STORAGE.SLIDES, '1'); } catch {}
    }
    if (joyIndex !== 2) return;
    if (haveSlides) {
      setTimeout(() => {
        computeAnchors();
        setStep(3);
      }, 80);
    }
  }, [joyIndex, storyPoints, computeAnchors, setStep]);

  const steps = useMemo(() => {
    const list = [
      {
        target: '.tutorial-banner',
        placement: 'bottom',
        title: 'Tutorial mode',
        content:
          'This canvas runs in guided mode. First fetch slides, then learn how to interact with them.',
        disableBeacon: true,
      },
      anchors.sp?.cls
        ? {
            target: `.${anchors.sp.cls}`,
            title: 'Story Point',
            content:
              'Click this Story Point to reveal the “Retrieve alternative slides” action.',
          }
        : {
            target: '.tutorial-stage',
            placement: 'center',
            title: 'Story Point',
            content: 'Click the Story Point node to reveal the retrieve action.',
          },
      {
        target: '.retrieve-alt-btn',
        title: 'Retrieve alternative slides',
        content:
          'Click here to fetch example slides. We will use those for the next steps.',
      },
      firstSlideKey && anchors.slides?.[firstSlideKey]?.cls
        ? {
            target: `.${anchors.slides[firstSlideKey].cls}`,
            title: 'Slides',
            content:
              '• Click to select / unselect\n' +
              '• Double-click to enlarge\n' +
              '• Drag to reposition\n' +
              '• Hover to view the AI summary',
          }
        : {
            target: '.tutorial-stage',
            placement: 'center',
            title: 'Slides',
            content:
              'Select, enlarge, drag and hover slides to explore. If you do not see any slides, click the retrieve button first.',
          },

      (firstSlideKey && anchors.edge?.cls)
        ? {
            target: `.${anchors.edge.cls}`,
            title: 'AI refining & relevance score',
            content:
              'The number on the line is the AI “slide-to-storypoint fit” score (0–10). Higher is better. ' +
              'Scores update after AI analysis and also influence the story point border color. ' +
              'To refine results, edit the Story Point or fetch alternatives again — the AI will re-evaluate the fit.',
          }
        : {
            target: '.tutorial-stage',
            placement: 'center',
            title: 'AI refining & relevance score',
            content:
              'The number on the line is the AI fit score (0–10). It appears after slides are fetched. ' +
              'Edit the Story Point or fetch alternatives to let the AI refine the results.',
          },

      {
        target: '.exit-tutorial-btn',
        placement: 'left',
        title: 'Exit tutorial',
        content: 'Click here any time to exit.',
      },
    ];
    return list;
  }, [anchors, firstSlideKey]);

  const handleJoyrideCallback = (data) => {
    const { action, index, status, type } = data;

    if (status === STATUS.SKIPPED) {
      setRun(false);
      try { sessionStorage.setItem(STORAGE.SKIPPED, '1'); } catch {}
      markDismissed();
      onExit?.();
      return;
    }

    if (status === STATUS.FINISHED) {
      setRun(false);
      markFinished();
      onExit?.();
      return;
    }

    if (type === 'step:after' && action === 'next') {
      if (index === 1 && !hasRetrieveButton()) {
        setStep(1);
        return;
      }

      if (index === 2 && !(storyPoints[0]?.slides?.length > 0)) {
        setStep(2);
        return;
      }
      setStep(index + 1);
      return;
    }

    if (type === 'step:after' && action === 'prev') {
      setStep(Math.max(0, index - 1));
      return;
    }
  };

  const handleExit = () => {
    try {
      sessionStorage.removeItem(STORAGE.STEP);
      sessionStorage.removeItem(STORAGE.SLIDES);
      sessionStorage.removeItem(STORAGE.SKIPPED);
    } catch {}
    markFinished();
    onExit?.();
  };

  return (
    <div
      className="tutorial-root fixed inset-0 z-[999] bg-white"
      onSubmit={(e) => e.preventDefault()}
    >
      <style>
        {`
          .tutorial-root .h-\\[calc\\(100vh-200px\\)\\] { height: 100vh !important; }
          .tutorial-root .overlay-box { position: absolute; pointer-events: none; }
        `}
      </style>

      <div className="tutorial-banner absolute top-0 left-0 right-0 z-50 flex items-center justify-between bg-emerald-600 text-white px-4 py-2 shadow">
        <div className="font-semibold">Tutorial mode</div>
        <div className="text-sm opacity-90">
          Step 1: reveal retrieve → Step 2: fetch slides → Step 3: work with slides → Step 4: understand AI score.
        </div>
        <button
          className="exit-tutorial-btn ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 rounded"
          onClick={handleExit}
          type="button"
        >
          Exit
        </button>
      </div>

      <Joyride
        steps={steps}
        run={run}
        stepIndex={joyIndex}
        continuous
        showSkipButton
        showBackButton
        showProgress
        disableScrolling
        scrollToFirstStep
        callback={handleJoyrideCallback}
        locale={{ back: 'Back', close: 'Close', last: 'Finish', next: 'Next', skip: 'Skip' }}
        styles={{
          options: {
            zIndex: 10000,
            overlayColor: 'rgba(0,0,0,0.55)',
            primaryColor: '#15803d',
          },
        }}
      />

      <div ref={stageRef} className="tutorial-stage relative w-full h-full pt-10">
        {anchors.sp && (
          <div
            className={`overlay-box ${anchors.sp.cls}`}
            style={{
              left: anchors.sp.left,
              top: anchors.sp.top,
              width: anchors.sp.width,
              height: anchors.sp.height,
            }}
          />
        )}

        {firstSpId &&
          storyPoints[0]?.slides?.map((s) => {
            const key = `${firstSpId}_${s.id}`;
            const a = anchors.slides[key];
            if (!a) return null;
            return (
              <div
                key={key}
                className={`overlay-box ${a.cls}`}
                style={{ left: a.left, top: a.top, width: a.width, height: a.height }}
              />
            );
          })}

        {anchors.edge && (
          <div
            className={`overlay-box ${anchors.edge.cls}`}
            style={{
              left: anchors.edge.left + 50,
              top: anchors.edge.top + 35,
              width: anchors.edge.width - 100,
              height: anchors.edge.height - 20,
            }}
          />
        )}

        <GraphVisualization
          storyPoints={storyPoints}
          setStoryPoints={setStoryPoints}
          selectedNodes={selectedNodes}
          setSelectedNodes={setSelectedNodes}
          onNodeEdit={onNodeEdit}
          lockedNodes={lockedNodes}
          networkRef={networkRef}
          setIsLoading={setIsLoading}
          driver={driver}
          layoutMode={layoutMode}
          nodePositions={nodePositions}
          setNodePositions={setNodePositions}
        />
      </div>

      {editingSP && (
        <StoryPointEditDialog
          storyPoint={storyPoints.find((sp) => sp.id === editingSP)}
          onClose={() => setEditingSP(null)}
          networkRef={networkRef}
          lockedNodes={lockedNodes}
          onSave={handleSave}
          onRegenerate={handleRegenerate}
        />
      )}
    </div>
  );
};

export default GraphTutorial;
