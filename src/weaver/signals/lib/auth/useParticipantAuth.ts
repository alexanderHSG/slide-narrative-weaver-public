import { useEffect, useState } from 'react';

type WhoAmIResponse = {
  pid: string | null;
  prototype?: 'I2' | 'C1' | 'C2' | 'I1';
};

export function useParticipantAuth() {
  const [pid, setPid] = useState<string | null>(null);
  const [prototype, setPrototype] = useState<'I2' | 'C1' | 'C2' | 'I1' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancel = false;

    (async () => {
      try {
        const res = await fetch('/.netlify/functions/whoami', { credentials: 'include' });
        const data: WhoAmIResponse = res.ok ? await res.json() : { pid: null, prototype: null };

        if (!cancel) {
          setPid(data?.pid ?? null);
          setPrototype(data?.pid ? (data?.prototype ?? null) : null);
        }
      } catch {
        if (!cancel) { setPid(null); setPrototype(null); }
      } finally {
        if (!cancel) setIsLoading(false);
      }
    })();

    return () => { cancel = true; };
  }, []);

  return { pid, prototype, isLoading };
}
