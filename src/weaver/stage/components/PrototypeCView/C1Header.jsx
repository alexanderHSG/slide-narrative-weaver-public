import { useEffect, useId, useRef } from 'react';
import { Search, X, ChevronDown, Layers, Folder } from 'lucide-react';
import { useUser } from '../UserAccessWrapper/UserAccessWrapper';

export default function C1Header({
  query, setQuery,
  folders,
  selectedFolder,
  selectedDeck,
  onSelectFolder,
  onClearDeck,
  rightSlot,
}) {
  const inputId = useId();
  const searchRef = useRef(null);

  const categories = (folders || []).map(f => ({
    key: f.folder_topic,
    name: f.folder_topic,
    count: (f.decks || []).length,
  }));

  const { prototype } = useUser() ?? {};
  const variant = ['C1','C2'].includes(prototype) ? prototype : 'C1';
  const wasInDeck = useRef(!!selectedDeck);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target?.tagName || '').toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
          searchRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const enteringDeck = !!selectedDeck && !wasInDeck.current;
    const leavingDeck  = !selectedDeck && wasInDeck.current;

    if (enteringDeck || leavingDeck || selectedDeck && query) {
      setQuery?.('');
      searchRef.current?.blur();
    }
    wasInDeck.current = !!selectedDeck;
  }, [selectedDeck]);

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 p-2">
            <Layers className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold tracking-tight truncate">
              Inspira — Prototype
            </span>
            <span
              className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[11px] font-medium ring-1 ring-emerald-200"
              title={`Active variant: ${variant}`}
            >
              {variant}
            </span>
          </div>
        </div>

        <div className="relative ml-2 sm:ml-4">
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            aria-haspopup="listbox"
            aria-label="Select category"
            title={selectedFolder ? `Category: ${selectedFolder}` : 'Select category'}
          >
            <Folder className="h-4 w-4 text-emerald-700" />
            <span className="w-[18ch] truncate">
              {selectedFolder || 'Select category'}
            </span>
            {selectedFolder ? (
              <span className="ml-1 inline-flex items-center rounded px-1.5 py-0.5 text-[11px] bg-gray-100 text-gray-700">
                {
                  (categories.find(c => c.key === selectedFolder)?.count) ?? 0
                }
              </span>
            ) : null}
            <ChevronDown className="h-4 w-4 opacity-70" />
          </button>

          <select
            className="absolute inset-0 opacity-0 cursor-pointer"
            aria-label="Choose category"
            value={selectedFolder || ''}
            onChange={(e) => onSelectFolder?.(e.target.value)}
          >
            {(categories || []).map(c => (
              <option key={c.key} value={c.key}>
                {c.name} ({c.count})
              </option>
            ))}
          </select>
        </div>

        <div className="relative ml-2 sm:ml-4 flex-1 max-w-xl">
          <label htmlFor={inputId} className="sr-only">Search</label>
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input
            ref={searchRef}
            id={inputId}
            value={query}
            onChange={(e) => setQuery?.(e.target.value)}
            placeholder="Search by title…"
            className="w-full rounded-lg border border-gray-200 pl-9 pr-16 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          <div
            className="pointer-events-none absolute right-10 top-2 inline-flex items-center rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] text-gray-500"
            aria-hidden="true"
          >
            /
          </div>
          {query ? (
            <button
              onClick={() => setQuery?.('')}
              className="absolute right-2 top-2 rounded p-1 text-gray-400 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              aria-label="Clear search"
              title="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {rightSlot ? (
          <div className="ml-2 sm:ml-4 shrink-0">
            {rightSlot}
          </div>
        ) : null}
      </div>
    </header>
  );
}
