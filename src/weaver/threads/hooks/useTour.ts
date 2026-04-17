import { useState, useCallback, useEffect, useRef } from 'react';
import type { CallBackProps, Step } from 'react-joyride';
import { STATUS } from 'react-joyride';
import {
  logger,
  ActionTypes,
  InteractionStatus,
  InteractionTypes,
} from '@/weaver/toolkit/utils/logger/logger.js';
import { supabase } from '@/weaver/signals/lib/auth/supabaseClient.js';

type UseTourParams = {
  user?: unknown;
  hasCompletedTutorial?: boolean | null;
  setHasCompletedTutorial: (v: boolean) => void;
  isExp?: boolean;
  onFinish?: () => void;
};

type UseTourReturn = {
  runTour: boolean;
  tourStep: number;
  handleTourCallback: (data: CallBackProps) => void;
  tourSteps: Step[];
  offerOpen: boolean;
  acceptOffer: () => void;
  declineOffer: () => void;
  neverOffer: () => void;
  shouldOpenGraphTutorial: boolean;
  setShouldOpenGraphTutorial: (v: boolean) => void;
};

const tourSteps: Step[] = [
  { target: '.create-story-btn', content: 'Start a new story presentation from scratch', placement: 'right', disableBeacon: true },
  { target: '.preview-btn', content: 'Preview your story', placement: 'right', disableBeacon: true },
  { target: '[title="Clear Selected Slides"]', content: 'Clear all currently selected slides and reset their styling', placement: 'right', disableBeacon: true },
  { target: '[title="PDF Processing"]', content: 'Upload and process PDF documents to extract content and create story points (under development)', placement: 'right', disableBeacon: true },
  { target: '[title="Advanced Search"]', content: 'Use powerful search features to find specific content across your story points and slides', placement: 'right', disableBeacon: true },
  { target: '.board-menu', content: 'The Board view shows your story canvas and main editing tools.', placement: 'bottom', disableBeacon: true },
  { target: '.help-menu', content: 'Access help documentation, keyboard shortcuts, and usage guides', placement: 'bottom', disableBeacon: true },
  { target: '.profile-menu', content: 'Logout from the application', placement: 'bottom', disableBeacon: true },
  { target: '.export-btn', content: "When you're ready, export your selected slides to a presentation.", placement: 'left', disableBeacon: true },
];

export function useTour({
  user,
  hasCompletedTutorial,
  setHasCompletedTutorial,
  isExp,
  onFinish,
}: UseTourParams): UseTourReturn {
  const [runTour, setRunTour] = useState<boolean>(false);
  const [tourStep, setTourStep] = useState<number>(0);
  const [offerOpen, setOfferOpen] = useState<boolean>(false);
  const [shouldOpenGraphTutorial, setShouldOpenGraphTutorial] = useState<boolean>(false);
  const hasLoggedThisRunRef = useRef<boolean>(false);

  useEffect(() => {
    if (hasCompletedTutorial === false) {
      hasLoggedThisRunRef.current = false;
      setRunTour(true);
    }
  }, [hasCompletedTutorial]);

  const markTutorialAsCompleted = useCallback(async () => {
    setHasCompletedTutorial(true);

    if (isExp) {
      try {
        sessionStorage.setItem('hasCompletedJoyrideExp', 'true');
      } catch (e) {
        console.error('Failed to set sessionStorage for experimental user:', e);
      }
    } else if (user) {
      const { error } = await supabase.functions.invoke('update-tutorial-status');
      if (error) {
        console.error('Error invoking function to update tutorial status:', error);
      }
    } else {
      try {
        localStorage.setItem('hasSeenTour', 'true');
      } catch (e) {
        console.error('Failed to set localStorage for anonymous user:', e);
      }
    }
  }, [user, isExp, setHasCompletedTutorial]);

  const handleTourCallback = useCallback((data: CallBackProps) => {
    const finished = data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED;

    if (!finished) {
      if (typeof data.index === 'number') setTourStep(data.index);
      return;
    }

    if (hasLoggedThisRunRef.current) {
      setRunTour(false);
      if (onFinish) onFinish();
      return;
    }
    hasLoggedThisRunRef.current = true;

    setRunTour(false);

    const doneLabel = data.status === STATUS.FINISHED ? 'finished' : 'skipped';

    logger?.logInteraction?.(ActionTypes.SESSION, {
      interaction_type: InteractionTypes.TUTORIAL_COMPLETE,
      component: 'Tutorial',
      status: InteractionStatus.SUCCESS,
      input_data: { done: doneLabel },
      metadata: { isExp: !!isExp },
    });

    if (doneLabel === 'finished') {
      void markTutorialAsCompleted();
    }

    const dismissed = localStorage.getItem('graphTutorialOfferDismissed') === '1';
    if (!dismissed) {
      setOfferOpen(true);
    }

    if (onFinish) onFinish();
  }, [isExp, onFinish, markTutorialAsCompleted]);

  useEffect(() => {
    const restartHandler = () => {
      if (!user) {
        localStorage.removeItem('hasSeenTour');
      }
      hasLoggedThisRunRef.current = false;
      setTourStep(0);
      setRunTour(true);
      setOfferOpen(false);
      setShouldOpenGraphTutorial(false);
    };
    window.addEventListener('joyride:restart', restartHandler);
    return () => {
      window.removeEventListener('joyride:restart', restartHandler);
    };
  }, [user]);

  useEffect(() => {
    const openOfferEvt = () => setOfferOpen(true);
    window.addEventListener('joyride:offer', openOfferEvt);
    return () => window.removeEventListener('joyride:offer', openOfferEvt);
  }, []);

  const acceptOffer = useCallback(() => {
    setOfferOpen(false);
    setShouldOpenGraphTutorial(true);
  }, []);

  const declineOffer = useCallback(() => {
    setOfferOpen(false);
  }, []);

  const neverOffer = useCallback(() => {
    localStorage.setItem('graphTutorialOfferDismissed', '1');
    setOfferOpen(false);
  }, []);

  return {
    runTour,
    tourStep,
    handleTourCallback,
    tourSteps,
    offerOpen,
    acceptOffer,
    declineOffer,
    neverOffer,
    shouldOpenGraphTutorial,
    setShouldOpenGraphTutorial,
  };
}
