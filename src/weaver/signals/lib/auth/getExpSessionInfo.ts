export type ExpSessionInfo = {
  hasCookie: boolean;
  valid: boolean;
  expired: boolean;
  pid: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  remainingSeconds: number | null;
  aud: string | null;
  configuredDefaultTtlMinutes: number | null;
  serverTime: string;
  reason?: string;
};

export async function getExpSessionInfo(): Promise<ExpSessionInfo | null> {
  try {
    const res = await fetch('/.netlify/functions/exp-session-info', {
      credentials: 'include',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
