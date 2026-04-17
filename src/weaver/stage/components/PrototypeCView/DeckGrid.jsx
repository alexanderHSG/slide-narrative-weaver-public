import DeckCard from './DeckCard';

function SkeletonCard() {
  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white shadow-sm animate-pulse overflow-hidden flex flex-col">
      <div className="p-4 flex-1">
        <div className="mb-3 h-4 w-16 rounded bg-slate-100" />
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-slate-100" />
          <div className="min-w-0 flex-1">
            <div className="h-4 w-11/12 rounded bg-slate-100" />
            <div className="mt-2 h-3 w-7/12 rounded bg-slate-100" />
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200 bg-slate-50/70 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-6 w-20 rounded bg-slate-100" />
          <div className="h-6 w-28 rounded bg-slate-100" />
          <div className="h-6 w-24 rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export default function DeckGrid({
  selectedFolder,
  decks,
  loading,
  onOpen,
  onHoverStart,
  onHoverEnd,
  skeletonCount = 12,
}) {
  const hasData = Array.isArray(decks) && decks.length > 0;

  return (
    <section aria-busy={loading} aria-live="polite">
      <header className="mb-3">
        <h2 className="text-sm text-slate-500">
          {selectedFolder ? `Category: ${selectedFolder}` : 'All categories'}
        </h2>
      </header>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5 md:gap-6 items-stretch">
        {loading && !hasData &&
          Array.from({ length: skeletonCount }).map((_, i) => (
            <div key={`sk-${i}`} className="h-full">
              <SkeletonCard />
            </div>
          ))
        }

        {(!loading || hasData) && decks?.map((deck) => (
          <div
            key={deck?.id || deck?.title}
            className="h-full"
            onMouseEnter={() => onHoverStart?.(deck)}
            onMouseLeave={() => onHoverEnd?.(deck)}
          >
            <DeckCard deck={deck} active={false} onOpen={onOpen} />
          </div>
        ))}
      </div>
    </section>
  );
}

