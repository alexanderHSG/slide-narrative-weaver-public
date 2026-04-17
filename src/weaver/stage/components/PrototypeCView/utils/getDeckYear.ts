export function getDeckYear(title: string) {
  const m = String(title || '').match(/\b(20\d{2})\b/);
  return m ? m[1] : null;
}
