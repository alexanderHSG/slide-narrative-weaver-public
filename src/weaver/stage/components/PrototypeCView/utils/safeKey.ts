export function safeKey(...parts: Array<string | number | null | undefined>): string {
  return parts
    .filter(Boolean)
    .map((p) => String(p).replace(/[^a-z0-9-_]/gi, '_'))
    .join('__');
}
