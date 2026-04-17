let current: string | null = null;
const listeners = new Set<(db: string) => void>();

export const dbStore = {
  get() { return current; },
  set(db: string) {
    if (!db || db === current) return;
    current = db;
    for (const fn of listeners) fn(current);
  },
  subscribe(fn: (db: string) => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }
};
