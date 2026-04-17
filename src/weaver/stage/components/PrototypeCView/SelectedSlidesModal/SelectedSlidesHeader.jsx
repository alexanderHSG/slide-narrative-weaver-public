import { X, Download } from 'lucide-react';

export default function SelectedSlidesHeader({ count, onExport, onClose }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
      <div>
        <h2 className="text-lg font-semibold text-green-900">
          Selected slides • {count}
        </h2>
        <p className="text-xs text-slate-500">
          Tip: drag thumbnails to reorder • press{' '}
          <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded">E</kbd> to export
        </p>
      </div>
      <div className="flex items-center gap-2">
        {onExport && (
          <button
            onClick={onExport}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-green-800 transition-colors flex items-center gap-2"
            title="Export"
            disabled={count === 0}
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        )}
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full" aria-label="Close">
          <X className="w-5 h-5 text-slate-700" />
        </button>
      </div>
    </div>
  );
}
