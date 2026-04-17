import { useEffect, useState } from 'react';

export function clsx(...xs) {
  return xs.filter(Boolean).join(' ');
}

export async function safeJson(res) {
  try { return await res.json(); } catch { return {}; }
}

export function useDebounced(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
