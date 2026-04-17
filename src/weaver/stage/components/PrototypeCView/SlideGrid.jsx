import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SlideThumb from './SlideThumb.jsx';
import { safeKey } from '@/weaver/toolkit/utils/safeKey.ts';

export default function SlideGrid({
  selectedDeck,
  filteredSlides,
  loading,
  onBack,
  onPreview,
  imgLoading = 'lazy',
  imgDecoding = 'async',
  selectedKeys,
  onToggleSelect,
}) {
  const lastClickedIndex = useRef(null);
  const isControlled = typeof selectedKeys !== 'undefined';
  const keyFor = (s) => `${selectedDeck?.id}::${s?.id}`;

  const [selectedSlides, setSelectedSlides] = useState(() => {
    const key = `selectedSlides:${selectedDeck?.id || 'global'}`;
    const saved = localStorage.getItem(key);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    if (!isControlled) {
      const key = `selectedSlides:${selectedDeck?.id || 'global'}`;
      localStorage.setItem(key, JSON.stringify(Array.from(selectedSlides)));
    }
  }, [selectedSlides, selectedDeck, isControlled]);

  if (!selectedDeck) return null;
  const title = selectedDeck?.title || 'Deck';

  const handleSelection = (slideId, index, isShiftClick) => {
    const next = new Set(selectedSlides);
    if (isShiftClick && lastClickedIndex.current !== null) {
      const start = Math.min(lastClickedIndex.current, index);
      const end = Math.max(lastClickedIndex.current, index);
      for (let i = start; i <= end; i++) next.add(filteredSlides[i].id);
    } else {
      next.has(slideId) ? next.delete(slideId) : next.add(slideId);
    }
    lastClickedIndex.current = index;
    setSelectedSlides(next);
  };

  return (
    <section className="mt-1" aria-busy={loading ? 'true' : 'false'}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 rounded"
            aria-label="Back to decks"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden /> Back to decks
          </button>
          <span className="text-sm text-gray-700">
            <span className="font-medium">{title}</span>
            {filteredSlides?.length ? (
              <span className="text-gray-400">{' · '}{filteredSlides.length} slides</span>
            ) : null}
          </span>
        </div>
        {loading && <div className="text-xs text-gray-500">Loading…</div>}
      </div>

      {filteredSlides.length > 0 && (
        <div
          className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 auto-rows-fr"
          role="grid"
          aria-label="Slides"
        >
          {filteredSlides.map((s, idx) => {
            const isSelected = isControlled
              ? (selectedKeys instanceof Map
                  ? selectedKeys.has(keyFor(s))
                  : selectedKeys?.has?.(keyFor(s)))
              : selectedSlides.has(s.id);

            return (
              <motion.div
                role="gridcell"
                aria-selected={isSelected}
                key={safeKey('slide', selectedDeck?.id, s?.id, idx)}
                className="relative overflow-hidden rounded-xl group"
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: idx * 0.02 }}
              >
                <div
                  className="absolute top-2 left-2 z-20 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isControlled) {
                      if (e.shiftKey && lastClickedIndex.current !== null) {
                        const start = Math.min(lastClickedIndex.current, idx);
                        const end = Math.max(lastClickedIndex.current, idx);
                        for (let i = start; i <= end; i++) {
                          onToggleSelect?.(filteredSlides[i], i, false);
                        }
                        lastClickedIndex.current = idx;
                      } else {
                        onToggleSelect?.(s, idx, false);
                        lastClickedIndex.current = idx;
                      }
                    } else {
                      handleSelection(s.id, idx, e.shiftKey);
                    }
                  }}
                >
                  <AnimatePresence>
                    {isSelected ? (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <CheckCircle2 className="w-6 h-6 text-white bg-emerald-500 rounded-full" />
                      </motion.div>
                    ) : (
                      <Circle className="w-6 h-6 text-white/70 bg-black/20 rounded-full transition-transform duration-200 group-hover:scale-110 group-hover:text-white" />
                    )}
                  </AnimatePresence>
                </div>

                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      className="absolute inset-0 bg-emerald-900/40 ring-4 ring-emerald-500 rounded-xl pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                </AnimatePresence>

                <SlideThumb
                  slide={s}
                  onClick={onPreview}
                  width={320}
                  height={180}
                  fetchPriority={idx < 8 ? 'high' : 'low'}
                  loading={imgLoading}
                  decoding={imgDecoding}
                  className="w-full h-full object-cover transition-transform duration-300 transform group-hover:scale-105 cursor-pointer"
                />
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}
