import { Layers } from "lucide-react";
import clsx from "clsx";
import { getDeckYear } from '@/weaver/toolkit/utils/getDeckYear.ts';

const HEADER_H_PX = 92;
const FOOTER_H_PX = 64;

export default function DeckCard({ deck, active = false, onOpen }) {
  const titleRaw = deck?.title || "Untitled deck";
  const slides = Number.isFinite(deck?.slide_count) ? deck.slide_count : 0;
  const year = getDeckYear(titleRaw);

  return (
    <button
      type="button"
      onClick={() => onOpen?.(deck)}
      title={titleRaw}
      aria-label={`Open deck: ${titleRaw}`}
      className={clsx(
        "group relative w-full h-full overflow-hidden rounded-2xl border bg-white",
        "shadow-sm transition will-change-transform",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500",
        active
          ? "border-emerald-300 bg-emerald-50 shadow-md"
          : "border-slate-200 hover:-translate-y-[2px] hover:border-emerald-300 hover:shadow-md"
      )}
      style={{
        display: "grid",
        gridTemplateRows: `${HEADER_H_PX}px ${FOOTER_H_PX}px`,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl bg-emerald-500 opacity-0 transition group-hover:opacity-[0.04] group-active:opacity-[0.06]"
      />

      <div className="relative z-10 h-full w-full p-5">
        <div
          className="grid items-start gap-3"
          style={{ gridTemplateColumns: `40px minmax(0,1fr)` }}
        >
          <div
            className="grid place-items-center rounded-xl bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200/70"
            style={{ width: 40, height: 40 }}
          >
            <Layers className="h-5 w-5" aria-hidden />
          </div>

          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold leading-snug text-slate-900 line-clamp-2">
              {titleRaw}
            </h3>
          </div>
        </div>
      </div>

      <div className="relative z-10 h-full w-full rounded-b-2xl border-t border-slate-200 bg-slate-50 px-4 py-4">
        <div className="flex h-full items-center gap-2 text-slate-600">
          <span className="text-sm">{slides} slides</span>
          {year ? <span className="text-sm">• {year}</span> : null}
        </div>
      </div>
    </button>
  );
}
