import 'jspdf-autotable';
import { useCallback, useEffect, useRef } from 'react';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'vis-network/styles/vis-network.css';
import './App.css';

import { supabase, useSession } from '@/weaver/signals/lib/auth/supabaseClient.js';
import '@/weaver/atlas/config/pdfjs.js';
import { logger } from '@/weaver/toolkit/utils/logger/logger.js';
import { safeLogInteraction } from '@/weaver/toolkit/utils/logger/safeLogInteraction.js';

import UserAccessWrapper, { useUser } from '@/weaver/stage/components/UserAccessWrapper/UserAccessWrapper.jsx';
import MainLayout from '@/weaver/stage/components/MainLayout/MainLayout.jsx';
import { TourOfferModal } from '@/weaver/stage/components/tutorial/TourOfferModal.jsx';
import DbSwitchReset from './DBSwitchReset.jsx';
import GraphTutorial from '@/weaver/stage/components/tutorial/GraphTutorial.jsx';
import { startExpSessionWatcher } from '@/weaver/signals/lib/auth/expSessionWatcher.ts';

import {
  useAppState,
  useGraphLogic,
  useHistoryManager,
  useKeyboardShortcuts,
  useToolbarActions,
  useStoryPointDialogHandlers,
  useAppInitialization,
  useShowInitialContainers,
  useEnforceAllowList,
  useTour,
  useDialogs,
} from '@/weaver/threads/hooks/index.ts';

import { handleNodeEdit, handleSaveStoryPoint } from '@/weaver/signals/lib/storyPoints/storyPointsActions.ts';
import { handleFormSubmit } from '@/weaver/signals/lib/storyPoints/handleFormSubmit.ts';
import { generateSlidesFromTitle } from '@/weaver/signals/lib/storyPoints/generateSlidesFromTitle.ts';
import loadFromNeo4j from '@/weaver/toolkit/utils/loadFromNeo4j.js';

const App = () => {
  useEnforceAllowList();
  const session = useSession();

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
        if (error) console.error('setSession error', error);
        window.history.replaceState({}, document.title, window.location.pathname);
        window.location.reload();
      });
    }
  }, []);

  return (
    <UserAccessWrapper session={session}>
      <AppInner />
    </UserAccessWrapper>
  );
};

const AppInner = () => {
  const {
    activeTool, setActiveTool,
    activeMenu, setActiveMenu,
    toggleExportDialog, showExportDialog,
    showPreview, setShowPreview,
    viewSettings, setViewSettings,
    loading, setLoading,
    storyPoints, setStoryPoints,
    editingStoryPoint, setEditingStoryPoint,
    isFormOpen, setIsFormOpen,
    showImages,
    selectedNodes, setSelectedNodes,
    lockedNodes, setLockedNodes,
    selectedNodeInfo, setSelectedNodeInfo,
    mousePosition, setMousePosition,
    selectedSlidesSet, setSelectedSlidesSet,
    toggleLockNode,
    isAuthenticated, setIsAuthenticated,
    showLogin, setShowLogin,
    hasConsented, setHasConsented,
    sessionData, setSessionData,
    setUserId, setProlificId,
    sharedNetworkRef, pdfProcessorRef, analyticsRef, interactionTrackerRef,
    setFilterActive,
    layoutMode, setLayoutMode,
    nodePositions, setNodePositions,
    driver,
    hasCompletedTutorial, setHasCompletedTutorial,
  } = useAppState();

  const [showInitialContainers, setShowInitialContainers] = useShowInitialContainers();
  const memoizedSafeLogInteraction = useCallback(safeLogInteraction, []);
  const { confirm, alert, Dialogs } = useDialogs();

  const session = useSession();
  const { userId: expUserId, isExp, prototype } = useUser() || {};

  useEffect(() => {
    const fetchUserProfile = async (userIdToFetch) => {
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('has_completed_joyride')
          .eq('user_id', userIdToFetch)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data?.has_completed_joyride || false;
      } catch (error) {
        console.error("Error fetching user profile:", error);
        return false;
      }
    };

    const handleAuthentication = async () => {
      const effectiveUserId = session?.user?.id || expUserId;

      if (effectiveUserId) {
        setIsAuthenticated(true);
        setShowLogin(false);
        setUserId(effectiveUserId);

        if (session) {
          setSessionData(session);
          setProlificId(session.user.user_metadata?.prolificId || null);
        }

        const completedInDb = await fetchUserProfile(effectiveUserId);

        if (isExp) {
          const completedInSession = sessionStorage.getItem('hasCompletedJoyrideExp') === 'true';
          setHasCompletedTutorial(completedInSession);
        } else {
          setHasCompletedTutorial(completedInDb);
        }
      } else {
        setIsAuthenticated(false);
        setShowLogin(true);
      }
    };

    handleAuthentication();
  }, [
    session,
    expUserId,
    isExp,
    setSessionData,
    setUserId,
    setIsAuthenticated,
    setShowLogin,
    setHasCompletedTutorial,
    setProlificId,
  ]);

  const user = session?.user || null;
  const isI2 = isExp && prototype === 'I2';
  const isAdmin =
    activeMenu === 'admin' ||
    (typeof window !== 'undefined' &&
      (window.location.pathname.includes('/admin') ||
        window.location.hash.includes('#admin')));

  const {
    ensureSlideVisibility,
    restoreNetworkFromState,
    handleLockNodesChange,
  } = useGraphLogic({
    sharedNetworkRef,
    setStoryPoints,
    setSelectedNodes,
    setLockedNodes,
  });

  const {
    addToHistory,
    handleUndo,
    handleRedo,
    canRedo,
    canUndo,
  } = useHistoryManager(sharedNetworkRef, setStoryPoints);

  useAppInitialization({
    setIsAuthenticated,
    setShowLogin,
    setUserId,
    setProlificId,
    setHasConsented,
    setSessionData,
    storyPoints,
    sharedNetworkRef,
    ensureSlideVisibility,
    restoreNetworkFromState,
    logInteraction: memoizedSafeLogInteraction,
    setSelectedNodes,
    setStoryPoints,
    setLockedNodes,
    showImages,
  });

  useKeyboardShortcuts({
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    activeTool,
    setActiveTool,
    sharedNetworkRef,
  });

  const {
    onLockNodes,
    onUnlockNodes,
    onAddEdge,
    onDeleteEdge,
    onDeleteNode,
    onDeleteSlides,
    handleClearAll,
  } = useToolbarActions({
    sharedNetworkRef,
    selectedNodes,
    lockedNodes,
    setLockedNodes,
    setShowInitialContainers,
    setStoryPoints,
    storyPoints,
    setSelectedNodes,
    setSelectedSlidesSet,
    handleLockNodesChange,
    addToHistory,
    driver,
    confirm,
    alert,
  });

  const { handleSave, handleRegenerate } = useStoryPointDialogHandlers({
    storyPoints,
    setStoryPoints,
    setEditingStoryPoint,
    addToHistory,
    sharedNetworkRef,
    lockedNodes,
  });

  const {
    runTour,
    handleTourCallback,
    tourSteps,
    offerOpen,
    acceptOffer,
    declineOffer,
    neverOffer,
    shouldOpenGraphTutorial,
    setShouldOpenGraphTutorial,
  } = useTour({
    user,
    hasCompletedTutorial,
    setHasCompletedTutorial,
    isExp,
  });

  const storyPointsRef = useRef(storyPoints);
  useEffect(() => {
    storyPointsRef.current = storyPoints;
  }, [storyPoints]);

  const handleDbReset = useCallback(
    (_db) => {
      if (Array.isArray(storyPointsRef.current) && storyPointsRef.current.length > 0) return;
      setStoryPoints([]);
      setSelectedNodes(new Set());
      setLockedNodes(new Set());
      setShowInitialContainers(true);
    },
    [setStoryPoints, setSelectedNodes, setLockedNodes, setShowInitialContainers]
  );

  useEffect(() => {
  if (!storyPoints || storyPoints.length === 0) {
    try { networkRef.current?.unselectAll?.() } catch {}
    setSelectedNodes(new Set());
    try { localStorage.removeItem('selectedSlides') } catch {}
  }
}, [storyPoints?.length]);

useEffect(() => {
  startExpSessionWatcher({
      pollSeconds: 15,
      leadSeconds: 0,
      redirectTo: '/login',
      onlyForExperimental: true,
    });
}, []);


  return (
    <>
      <Dialogs />
      <DbSwitchReset onReset={handleDbReset}>
        {!isAdmin && shouldOpenGraphTutorial && (
          <GraphTutorial
            onExit={() => {
              setShouldOpenGraphTutorial(false);
              if (isI2) {
                setShowPreview(true);
              } else {
                setShowPreview(false);
                setIsFormOpen(true);
              }
            }}
            driver={driver}
            loadFromNeo4j={loadFromNeo4j}
            pickStrategy="top3"
          />
        )}
        <MainLayout
          runTour={runTour}
          tourSteps={tourSteps}
          handleTourCallback={handleTourCallback}
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          selectedNodes={selectedNodes}
          canUndo={canUndo}
          canRedo={canRedo}
          handleUndo={handleUndo}
          handleRedo={handleRedo}
          onLockNodes={onLockNodes}
          onUnlockNodes={onUnlockNodes}
          onClearAll={handleClearAll}
          onAddEdge={onAddEdge}
          onDeleteEdge={onDeleteEdge}
          onDeleteNode={onDeleteNode}
          onDeleteSlides={onDeleteSlides}
          sharedNetworkRef={sharedNetworkRef}
          selectedNodeInfo={selectedNodeInfo}
          setSelectedNodeInfo={setSelectedNodeInfo}
          mousePosition={mousePosition}
          setMousePosition={setMousePosition}
          setSelectedNodes={setSelectedNodes}
          lockedNodes={lockedNodes}
          setLockedNodes={setLockedNodes}
          nodePositions={nodePositions}
          setNodePositions={setNodePositions}
          storyPoints={storyPoints}
          setStoryPoints={setStoryPoints}
          handleNodeEdit={handleNodeEdit}
          handleSave={handleSave}
          handleRegenerate={handleRegenerate}
          handleSaveStoryPoint={handleSaveStoryPoint}
          editingStoryPoint={editingStoryPoint}
          setEditingStoryPoint={setEditingStoryPoint}
          generateSlidesFromTitle={generateSlidesFromTitle}
          loading={loading}
          setLoading={setLoading}
          isFormOpen={isFormOpen}
          setIsFormOpen={setIsFormOpen}
          showInitialContainers={showInitialContainers}
          setShowInitialContainers={setShowInitialContainers}
          showImages={showImages}
          showPreview={showPreview}
          setShowPreview={setShowPreview}
          selectedSlidesSet={selectedSlidesSet}
          setSelectedSlidesSet={setSelectedSlidesSet}
          toggleLockNode={toggleLockNode}
          showExportDialog={showExportDialog}
          toggleExportDialog={toggleExportDialog}
          viewSettings={viewSettings}
          setViewSettings={setViewSettings}
          handleFormSubmit={handleFormSubmit}
          logger={logger}
          pdfProcessorRef={pdfProcessorRef}
          interactionTrackerRef={interactionTrackerRef}
          analyticsRef={analyticsRef}
          setFilterActive={setFilterActive}
          layoutMode={layoutMode}
          setLayoutMode={setLayoutMode}
          setShouldOpenGraphTutorial={setShouldOpenGraphTutorial}
        />
        {!isAdmin && (
          <TourOfferModal
            open={offerOpen}
            onAccept={() => {
              acceptOffer();
              setShowPreview(false);
            }}
            onDecline={() => {
              declineOffer();
              if (isI2) {
                setShowPreview(true);
                window.dispatchEvent(new Event('preview:open'));
              } else {
                setShowPreview(false);
                setIsFormOpen(true);
              }
            }}
            onNever={() => {
              neverOffer();
              if (isI2) {
                setShowPreview(true);
                window.dispatchEvent(new Event('preview:open'));
              } else {
                setShowPreview(false);
                setIsFormOpen(true);
              }
            }}
          />
        )}
      </DbSwitchReset>
    </>
  );
};

export default App;