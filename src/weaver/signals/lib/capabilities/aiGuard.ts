export function isAiEnabledFor({
  isExp,
  prototype,
  chatgptEnabled,
}: {
  isExp?: boolean;
  prototype?: string | null;
  chatgptEnabled?: boolean;
}) {

  if (!isExp) return true;
  const allowed = new Set(['I1', 'C1']);

  return allowed.has((prototype || '').trim()) && (chatgptEnabled ?? true)};