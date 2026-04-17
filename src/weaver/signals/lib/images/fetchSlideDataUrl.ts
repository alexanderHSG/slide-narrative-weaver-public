import { supabase } from '../auth/supabaseClient';

export async function fetchSlideDataUrl(objectId: string): Promise<string | null> {
  if (!objectId) return null;

  let headers: Record<string, string> = {};
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {}

  const res = await fetch(`/.netlify/functions/slide?objectId=${encodeURIComponent(objectId)}`, { headers });
  if (!res.ok) return null;

  const blob = await res.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
  return dataUrl;
}
