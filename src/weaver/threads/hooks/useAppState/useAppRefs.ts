import { useRef } from 'react';

export function useAppRefs() {
  const sharedNetworkRef = useRef(null);
  const pdfProcessorRef = useRef(null);
  const analyticsRef = useRef(null);
  const interactionTrackerRef = useRef(null);

  return {
    sharedNetworkRef,
    pdfProcessorRef,
    analyticsRef,
    interactionTrackerRef,
  };
}
