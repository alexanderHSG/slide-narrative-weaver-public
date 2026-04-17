import { useEffect, useMemo, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import SelectedSlidesHeader from './SelectedSlidesHeader';
import SelectedSlidesGrid from './SelectedSlidesGrid';
import SelectedSlidesFooter from './SelectedSlidesFooter';

export default function SelectedSlidesModal({
  open,
  items = [],
  onClose,
  onRemove,
  onClearAll,
  onExport,
  onReorder,
}) {
  const safeItems = useMemo(() => (Array.isArray(items) ? items.filter(it => it && it.key) : []), [items]);

  const [order, setOrder] = useState(() => safeItems.map(i => i.key));

  useEffect(() => {
    const nextKeys = safeItems.map(i => i.key);
    setOrder(prev => {
      const preserved = prev.filter(k => nextKeys.includes(k));
      const missing = nextKeys.filter(k => !preserved.includes(k));
      return [...preserved, ...missing];
    });
  }, [safeItems]);

  const count = useMemo(() => {
    const set = new Set(safeItems.map(i => i.key));
    return order.filter(k => set.has(k)).length;
  }, [order, safeItems]);

  const scrollRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key?.toLowerCase() === 'e') onExport?.(order);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onExport, order]);

  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = prev; };
  }, [open]);

  const handleOrderChange = (next) => {
    setOrder(next);
    onReorder?.(next);
  };

  const handleRemove = (key) => {
    onRemove?.(key);
    setOrder(prev => prev.filter(k => k !== key));
  };

  const handleClearAll = () => {
    onClearAll?.();
    setOrder([]);
  };

  const handleExport = () => onExport?.(order);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            className={[
              "w-full max-w-6xl max-h-[90vh] overflow-hidden overflow-x-hidden",
              "rounded-2xl bg-white border border-slate-200",
              "shadow-[0_40px_100px_-30px_rgba(2,6,23,0.55)]"
            ].join(' ')}
            initial={{ scale: 0.98, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.98, y: 8 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            role="dialog" aria-modal="true" aria-label="Review selected slides"
          >
            <SelectedSlidesHeader count={count} onExport={handleExport} onClose={onClose} />

            <div
              ref={scrollRef}
              className="relative p-6 overflow-y-auto overflow-x-hidden overscroll-y-contain overscroll-x-none touch-pan-y max-h-[70vh] bg-slate-50/40 min-w-0"
            >
              <SelectedSlidesGrid
                items={safeItems}
                order={order}
                onOrderChange={handleOrderChange}
                onRemove={handleRemove}
                containerRef={scrollRef}
              />
            </div>

            <SelectedSlidesFooter count={count} onClearAll={handleClearAll} onClose={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
