import { clientLogout } from '../auth/logoutClient';

type WatcherOptions = {
  pollSeconds?: number;
  leadSeconds?: number;
  redirectTo?: string;
  onlyForExperimental?: boolean;
  debug?: boolean;
};

let timerId: number | null = null;
let pollId: number | null = null;
let started = false;
let stopped = false;

const CHANNEL = 'exp-session-channel';
let bc: BroadcastChannel | null = null;

async function fetchInfo(): Promise<any | null> {
  try {
    const res = await fetch('/.netlify/functions/exp-session-info', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function scheduleLogout(ms: number, redirectTo: string, debug: boolean) {
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
  if (ms <= 0) {
    try {
      localStorage.setItem('exp-logout', String(Date.now()));
    } catch {}
    try {
      bc?.postMessage({ type: 'logout' });
    } catch {}
    void clientLogout(redirectTo);
    return;
  }
  timerId = window.setTimeout(() => {
    if (debug) console.log('[expWatcher] TTL reached → logout');
    try {
      localStorage.setItem('exp-logout', String(Date.now()));
    } catch {}
    try {
      bc?.postMessage({ type: 'logout' });
    } catch {}
    void clientLogout(redirectTo);
  }, ms);
}

export function startExpSessionWatcher(opts: WatcherOptions = {}) {
  if (started) return;
  started = true;
  stopped = false;

  const {
    pollSeconds = 30,
    leadSeconds = 0,
    redirectTo = '/login',
    onlyForExperimental = true,
    debug = false,
  } = opts;

  try {
    bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = (e) => {
      if (e?.data?.type === 'logout') {
        if (debug) console.log('[expWatcher] logout message from another tab');
        void clientLogout(redirectTo);
      }
    };
  } catch {}

  window.addEventListener('storage', (e) => {
    if (e.key === 'exp-logout') {
      if (debug) console.log('[expWatcher] storage → logout');
      void clientLogout(redirectTo);
    }
  });

  const tick = async () => {
    if (stopped) return;
    const info = await fetchInfo();
    if (!info) return;

    if (onlyForExperimental && !info.hasCookie) {
      if (debug) console.log('[expWatcher] no exp cookie → stop');
      stopExpSessionWatcher();
      return;
    }

    const serverNow = info.serverTime ? new Date(info.serverTime).getTime() : Date.now();
    const expiresAt = info.expiresAt ? new Date(info.expiresAt).getTime() : null;

    let remainingMs: number | null = null;
    if (typeof info.remainingSeconds === 'number') {
      remainingMs = info.remainingSeconds * 1000;
    } else if (expiresAt) {
      remainingMs = expiresAt - serverNow;
    }

    if (remainingMs == null) return;

    const logoutIn = Math.max(0, remainingMs - leadSeconds * 1000);
    if (debug) {
      console.log('[expWatcher] remainingMs=', remainingMs, 'logoutIn=', logoutIn);
    }
    scheduleLogout(logoutIn, redirectTo, debug);
  };

  void tick();

  pollId = window.setInterval(tick, Math.max(5, pollSeconds) * 1000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void tick();
  });
}

export function stopExpSessionWatcher() {
  stopped = true;
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
  if (pollId) {
    clearInterval(pollId);
    pollId = null;
  }
  try {
    bc?.close();
  } catch {}
  bc = null;
  started = false;
}
