export type C1Deck = {
  id: string;
  title?: string | null;
  slide_count?: number | null;
  category?: string | null;
};

export type C1Folder = {
  folder_topic: string;
  decks: C1Deck[];
};

type InputShapeA = { folders: Array<{ folder_topic?: string; category?: string; decks: C1Deck[] }> };
type InputShapeB = Array<{ category?: string; folder_topic?: string; decks: C1Deck[] }>;
type InputShapeC = Array<C1Deck>;

function sanitizeTitle(t?: string | null) {
  return (t ?? '').trim();
}

function byAlpha(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

function sortFolders(folders: C1Folder[]) {
  const tail = new Set(['Uncategorized', 'Other']);
  return [...folders].sort((a, b) => {
    const aTail = tail.has(a.folder_topic);
    const bTail = tail.has(b.folder_topic);
    if (aTail && !bTail) return 1;
    if (!aTail && bTail) return -1;
    return byAlpha(a.folder_topic, b.folder_topic);
  });
}

export function normalizeC1Folders(originalPayload: unknown, opts: { debug?: boolean } = {}): C1Folder[] {
  const dbg = !!opts.debug;
  let payload = originalPayload;

  if (payload && typeof payload === 'object') {
    if ('body' in (payload as any)) {
      payload = (payload as any).body;
    }
    if ('data' in (payload as any)) {
      payload = (payload as any).data;
    }
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'folders' in (payload as any) &&
    Array.isArray((payload as InputShapeA).folders)
  ) {
    const raw = (payload as InputShapeA).folders;
    const folders: C1Folder[] = raw.map((f) => ({
      folder_topic: (f.folder_topic || f.category || 'Uncategorized') as string,
      decks: (f.decks || []).map((d) => ({
        id: d.id,
        title: sanitizeTitle(d.title),
        slide_count: Number.isFinite(d.slide_count as number) ? (d.slide_count as number) : 0,
        category: d.category ?? f.category ?? f.folder_topic ?? 'Uncategorized',
      })),
    }));
    const out = sortFolders(folders);
    return out;
  }

  if (Array.isArray(payload) && payload.length && (payload[0] as any)?.decks) {
    const raw = payload as InputShapeB;
    const folders: C1Folder[] = raw.map((grp) => ({
      folder_topic: (grp.folder_topic || grp.category || 'Uncategorized') as string,
      decks: (grp.decks || []).map((d) => ({
        id: d.id,
        title: sanitizeTitle(d.title),
        slide_count: Number.isFinite(d.slide_count as number) ? (d.slide_count as number) : 0,
        category: d.category ?? grp.category ?? grp.folder_topic ?? 'Uncategorized',
      })),
    }));
    const out = sortFolders(folders);
    return out;
  }

  if (Array.isArray(payload) && (!payload.length || (payload[0] as any)?.id)) {
    const decks = (payload as InputShapeC) || [];
    const map = new Map<string, C1Deck[]>();
    for (const d of decks) {
      const cat = (d.category || 'Uncategorized') as string;
      const arr = map.get(cat) || [];
      arr.push({
        id: d.id,
        title: sanitizeTitle(d.title),
        slide_count: Number.isFinite(d.slide_count as number) ? (d.slide_count as number) : 0,
        category: d.category ?? cat,
      });
      map.set(cat, arr);
    }
    const folders: C1Folder[] = [...map.entries()].map(([folder_topic, decks]) => ({ folder_topic, decks }));
    const out = sortFolders(folders);
    return out;
  }

  return [];
}
