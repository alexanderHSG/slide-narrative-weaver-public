import { supabase } from '../auth/supabaseClient';
import { dbStore } from './dbStore';

let __netlifyFetchPatched = false;

export function installNetlifyFetchInterceptor() {
  if (typeof window === 'undefined' || __netlifyFetchPatched) return;

  const originalFetch = window.fetch.bind(window);
  const FN_PREFIX = '/.netlify/functions/';

  window.fetch = async (input, init = {}) => {
    try {
      const urlStr = typeof input === 'string' ? input : input.url;
      const { pathname } = new URL(urlStr, window.location.origin);
      if (!pathname.startsWith(FN_PREFIX)) {
        return await originalFetch(input, init);
      }
      const fnName = pathname.slice(FN_PREFIX.length).split('/')[0];

      const PUBLIC_FNS = new Set([
        'verify-session',
        'send-magic-link',
        'logout'
      ]);

      const headers = new Headers(init.headers || {});

      if (!PUBLIC_FNS.has(fnName)) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          if (token && !headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
          }
           let override = null;
          try {
            const saved = sessionStorage.getItem('dbOverride');
            if (saved === 'db_old' || saved === 'db_new') override = saved;
          } catch {}
  
          if (override) {
            headers.set('X-Target-Database', override);
          } else {
            headers.delete('X-Target-Database');
          }
        } catch (e) {
          console.warn('[fetch-interceptor] getSession failed:', e);
        }
      }

      return await originalFetch(input, { ...init, headers });
    } catch (err) {
      console.error('[fetch-interceptor] fatal error:', err);
      return await originalFetch(input, init);
    }
  };

  __netlifyFetchPatched = true;
}
