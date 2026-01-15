import { motion } from 'framer-motion';
import { X, Download, Eye } from 'lucide-react';

export default function SelectionActionBar({
  selectedCount,
  onClear,
  onExport,
  onView,
  className = '',
}) {
  const slideText = selectedCount === 1 ? 'slide' : 'slides';
  const disabled = selectedCount === 0;

  return (
    <motion.div
      className={[
        "fixed bottom-6 left-1/2 z-40",
        "flex items-center gap-4",
        "px-5 py-3 rounded-2xl",
        "bg-white",
        "border border-emerald-400",
        "shadow-[0_10px_40px_-10px_rgba(16,185,129,0.35)]",
        className
      ].join(' ')}
      initial={{ y: 100, opacity: 0, x: '-50%' }}
      animate={{ y: 0, opacity: 1, x: '-50%' }}
      exit={{ y: 100, opacity: 0, x: '-50%' }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      role="region"
      aria-label="Selection actions"
      style={{ willChange: 'transform, opacity' }}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-900">
          Selected: <span className="font-semibold text-emerald-600">{selectedCount}</span> {slideText}
        </span>
        <button
          onClick={onClear}
          disabled={disabled}
          className="p-1 text-sm text-gray-600 rounded-full hover:text-gray-900 hover:bg-gray-200 transition-colors disabled:opacity-40"
          aria-label="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-6 bg-gray-300" />

      <div className="flex items-center gap-2">
        <button
          onClick={onView}
          disabled={disabled}
          className={[
            "px-4 py-1.5 text-sm rounded-lg font-semibold transition-all",
            "bg-gradient-to-b from-gray-900 to-gray-800 text-white",
            "hover:from-gray-800 hover:to-gray-700",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "shadow-[0_6px_20px_-6px_rgba(0,0,0,0.35)]"
          ].join(' ')}
        >
          <span className="inline-flex items-center gap-2 transition-transform active:scale-95">
            <Eye className="w-4 h-4" /> Review selected
          </span>
        </button>

        <button
          onClick={() => onExport?.()}
          disabled={disabled}
          className={[
            "px-4 py-1.5 text-sm rounded-lg font-semibold transition-all",
            "bg-gradient-to-b from-emerald-600 to-emerald-700 text-white",
            "hover:from-emerald-500 hover:to-emerald-600",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "shadow-[0_8px_24px_-8px_rgba(16,185,129,0.6)]"
          ].join(' ')}
        >
          <span className="inline-flex items-center gap-2 transition-transform active:scale-95">
            <Download className="w-4 h-4" /> Export
          </span>
        </button>
      </div>
    </motion.div>
  );
}
