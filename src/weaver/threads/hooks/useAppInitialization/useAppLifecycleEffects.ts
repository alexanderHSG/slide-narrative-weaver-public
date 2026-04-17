import { useEffect } from 'react';
import  { supabase } from '@/weaver/signals/lib/auth/supabaseClient';
 
type UseAppLifecycleEffectsProps = {
  storyPoints: any[];
  sharedNetworkRef: React.RefObject<any>;
  ensureSlideVisibility: () => void;
  restoreNetworkFromState: () => void;
  setSessionData: (data: { sessionId: string; prolificId: string | null; startTime: string }) => void;
  logInteraction: (actionType: string, data: any) => Promise<void>;
};

export const useAppLifecycleEffects = ({
  storyPoints,
  sharedNetworkRef,
  ensureSlideVisibility,
  restoreNetworkFromState,
  setSessionData,
  logInteraction,
}: UseAppLifecycleEffectsProps) => {
  
  useEffect(() => {
    localStorage.setItem('storyPoints', JSON.stringify(storyPoints));

    if (Array.isArray(storyPoints) && storyPoints.length > 0) {
    const timer = setTimeout(() => {
      if (sharedNetworkRef?.current) {
        ensureSlideVisibility();
      }
    }, 1000);

    return () => clearTimeout(timer);
    }
  }, [storyPoints, sharedNetworkRef, ensureSlideVisibility]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(ensureSlideVisibility, 500);
      }
    };

    const handleSlidesUpdated = () => {
      setTimeout(ensureSlideVisibility, 500);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', ensureSlideVisibility);
    window.addEventListener('slides-updated', handleSlidesUpdated);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', ensureSlideVisibility);
      window.removeEventListener('slides-updated', handleSlidesUpdated);
    };
  }, [ensureSlideVisibility]);

  useEffect(() => {
    if (sharedNetworkRef?.current) {
      const timer = setTimeout(() => {
        restoreNetworkFromState();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [sharedNetworkRef, restoreNetworkFromState]);

  useEffect(() => {
    const retryInterval = setInterval(async () => {
      const failedLogs = JSON.parse(localStorage.getItem('failedLogs') || '[]');
      if (failedLogs.length === 0) return;

      const retryLog = failedLogs[0];
      try {
        await logInteraction(retryLog.actionType, retryLog.data);
        failedLogs.shift();
        localStorage.setItem('failedLogs', JSON.stringify(failedLogs));
      } catch (error) {
        console.error('Failed to retry log:', error);
      }
    }, 30000);

    return () => clearInterval(retryInterval);
  }, [logInteraction]);

  useEffect(() => {
    let cancelled = false;

    const initializeSession = async () => {
      const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const urlParams = new URLSearchParams(window.location.search);
      const prolificId = urlParams.get('PROLIFIC_PID');
      const startTime = new Date().toISOString();

      const [supabaseUser, experimentalPid] = await Promise.all([
        supabase.auth.getUser().then(({ data }) => data?.user ?? null).catch(() => null),
        fetch('/.netlify/functions/whoami', { credentials: 'include' })
          .then(r => (r.ok ? r.json() : { pid: null }))
          .then(j => j?.pid ?? null)
          .catch(() => null),
      ]);
      if (cancelled) return;

      const hasNamed = !!supabaseUser?.id;
      const hasExp   = !!experimentalPid;

      const userId    = hasNamed ? supabaseUser!.id : (hasExp ? experimentalPid : null);
      const userType  = hasNamed ? 'named' : (hasExp ? 'experimental' : null);
      const userEmail = hasNamed ? (supabaseUser?.email ?? null) : null;

      setSessionData({ sessionId, prolificId, startTime });

      if (!userId || !userType) return;

      await logInteraction('SESSION', {
        component: 'App',
        status: 'IN_PROGRESS',
        started_at: startTime,
        input_data: {
          user_id: userId,
          user_type: userType,
          user_email: userEmail,
          auth_sources: { named: hasNamed, experimental: hasExp },
        },
        metadata: {
          screen_size: `${window.innerWidth}x${window.innerHeight}`,
          user_agent: navigator.userAgent,
          platform: navigator.platform,
        },
      });
    };

    initializeSession();
    return () => { cancelled = true; };
  }, [setSessionData, logInteraction]);

};
