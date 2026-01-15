export default function SelectedSlidesFooter({ count, onClearAll, onClose }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white">
      <div className="text-xs text-slate-600">
        {count > 0
          ? 'Export includes slides in the order shown above.'
          : 'Nothing to export.'}
      </div>
      <div className="flex items-center gap-2">
        {onClearAll && count > 0 && (
          <button
            onClick={onClearAll}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition"
          >
            Clear all
          </button>
        )}
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_8px_20px_-8px_rgba(16,185,129,0.45)] transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}
