import { useAppLifecycleEffects } from "./useAppLifecycleEffects";
import { useAuthTokenCheck } from "./useAuthTokenCheck";
import { useEnforceImageState } from "../useEnforceImageState/useEnforceImageState";
import { useInitializeSelectedSlides } from "./useInitializeSelectedSlides";
import { useInitializeUserFromStorage } from "./useInitializeUserFromStorage";
import { useSyncNetworkWithStoryPoints } from "./useSyncNetworkWithStoryPoints";

export const useAppInitialization = ({
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
  logInteraction,
  setSelectedNodes,
  setStoryPoints,
  setLockedNodes,
  showImages,
}) => {
  useAuthTokenCheck(setIsAuthenticated, setShowLogin);

  useAppLifecycleEffects({
    storyPoints,
    sharedNetworkRef,
    ensureSlideVisibility,
    restoreNetworkFromState,
    setSessionData,
    logInteraction,
  });

  useEnforceImageState({
    showImages,
    sharedNetworkRef,
  });

  useInitializeUserFromStorage({
    setIsAuthenticated,
    setShowLogin,
    setUserId,
    setProlificId,
    setHasConsented,
  });

  useInitializeSelectedSlides(setSelectedNodes);

  useSyncNetworkWithStoryPoints(
    sharedNetworkRef,
    storyPoints,
    setStoryPoints,
    setSelectedNodes,
    setLockedNodes,
    ensureSlideVisibility,
  );
};
