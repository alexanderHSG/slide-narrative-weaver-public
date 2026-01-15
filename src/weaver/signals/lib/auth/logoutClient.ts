import { supabase } from './supabaseClient';


export async function clientLogout(redirectTo: string = '/login?expired=1') {
  try {
    await fetch('/.netlify/functions/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch {}

  try {
    await supabase.auth.signOut();
  } catch {}

  try {
    const keys = Object.keys(localStorage);
    for (const k of keys) {
      if (k.startsWith('sb-') || k.includes('supabase') || k === 'otp-token') {
        localStorage.removeItem(k);
      }
    }
  } catch {}

  try {
    sessionStorage.clear();
  } catch {}

  window.location.replace(redirectTo);
}
