import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useUser } from '../UserAccessWrapper/UserAccessWrapper';
import { logger, ActionTypes, InteractionTypes } from '@/weaver/toolkit/utils/logger/logger';
import { callC1DeckSlides, callC1Decks } from '@/weaver/signals/lib/api/apiClient';
import { EXPERIMENTAL_STORYPOINT_MIN, EXPERIMENTAL_STORYPOINT_MAX } from '@/weaver/atlas/constants/storyPoints';

import C1Header from './C1Header';
import { SidebarFolders } from './FolderSidebar';
import DeckGrid from './DeckGrid';
import SlideGrid from './SlideGrid';
import StorypointsPanel from './StorypointsPanel';
import ImageEnlarge from './ImageEnlarge';
import { normalizeC1Folders } from '@/weaver/toolkit/utils/normalizeC1Folders';
import Badge from './ui/Badge';
import EmptyState from './ui/EmptyState';
import LoadingOverlay from './ui/LoadingOverlay';
import ProfileMenu from '../ProfileMenu/ProfileMenu';
import SelectionActionBar from './SelectionActionBar';
import SelectedSlidesModal from './SelectedSlidesModal/SelectedSlidesModal';
import ExportDialog from '../ExportDialog/ExportDialog';

const PROTO_CONFIG = {
  C1: { prefix: 'c1', logComponent: 'PrototypeC1', aiEnabled: true },
  C2: { prefix: 'c2', logComponent: 'PrototypeC2', aiEnabled: false },
};

export default function PrototypeCView({ variant }) {
  const { userId, isExp, prototype } = useUser?.() ?? {};
  const active = isExp && prototype === variant;
  if (!active) return null;

  const cfg = PROTO_CONFIG[variant] ?? PROTO_CONFIG.C1;

  const UI_LS_KEY      = `${cfg.prefix}-ui-state-v1`;
  const DECKS_CACHE    = `${cfg.prefix}-cache-decks-v1`;
  const SP_STORAGE_KEY = `${cfg.prefix}-storypoints-v1`;
  const SELECTED_STORAGE_KEY = `${cfg.prefix}-selected-slides-v1`;
  const UI_LAST_DECK_KEY = 'lastDeckId';
  const UI_LAST_FOLDER_KEY = 'lastFolder';
  const SLIDES_TTL_MS  = 1000 * 60 * 15;
  const DECKS_TTL_MS   = 1000 * 60 * 15;

  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [slides, setSlides] = useState([]);
  const [previewObjectId, setPreviewObjectId] = useState(null);
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [revalidatingDecks, setRevalidatingDecks] = useState(false);
  const [loadingSlides, setLoadingSlides] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [storypoints, setStorypoints] = useState([]);
  const [query, setQuery] = useState('');
  const slidesCacheRef = useRef(new Map());
  const hoverTimersRef = useRef(new Map());
  const decksAbortRef = useRef(null);
  const slidesAbortRef = useRef(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showSelectedModal, setShowSelectedModal] = useState(false);
  const [selectedGlobal, setSelectedGlobal] = useState(() => new Map());
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState([]);

  const isExperimentalMode = !!isExp && (prototype === 'C1' || prototype === 'C2');
  const storypointCount = Array.isArray(storypoints) ? storypoints.length : 0;
  const needsMoreStorypoints = isExperimentalMode && storypointCount < EXPERIMENTAL_STORYPOINT_MIN;
  const exceedsStorypoints = isExperimentalMode && storypointCount > EXPERIMENTAL_STORYPOINT_MAX;
  const storyPointRangeValid = !isExperimentalMode || (!needsMoreStorypoints && !exceedsStorypoints);
  const requiresStoryPointGate = isExperimentalMode && !storyPointRangeValid;
  const storyPointGateMessage = needsMoreStorypoints
    ? `You currently have ${storypointCount} story point${storypointCount === 1 ? '' : 's'}. Create at least ${
        EXPERIMENTAL_STORYPOINT_MIN - storypointCount
      } more to reach the required ${EXPERIMENTAL_STORYPOINT_MIN}–${EXPERIMENTAL_STORYPOINT_MAX} range.`
    : `You currently have ${storypointCount} story points. Reduce the total to ${EXPERIMENTAL_STORYPOINT_MAX} or fewer before selecting slides.`;
  const shouldShowCreateHint = variant === 'C1' && needsMoreStorypoints;
  const shouldShowOverviewHint = variant === 'C2' && needsMoreStorypoints;

  const selectedItemsOrdered = useMemo(
    () => selectedOrder.map(k => selectedGlobal.get(k)).filter(Boolean),
    [selectedOrder, selectedGlobal]
  );

  const selectedSet = useMemo(() => new Set(selectedOrder), [selectedOrder]);
  
  useEffect(() => {
    if (Array.isArray(storypoints)) {
      logger?.logInteraction?.(ActionTypes.VISUALIZATION, {
        interaction_type: InteractionTypes.GRAPH_STATE_SNAPSHOT,
        component: cfg.logComponent || 'PrototypeCView',
        metadata: {
          variant,
          storypointCount: storypoints.length,
        }
      });
    }
  }, [variant, storypoints.length]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SELECTED_STORAGE_KEY) || localStorage.getItem(SELECTED_STORAGE_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) {
        const map = new Map();
        const order = [];
        for (const it of arr) {
          if (!it?.key) continue;
          map.set(it.key, it);
          order.push(it.key);
        }
        setSelectedGlobal(map);
        setSelectedOrder(order);
      }
    } catch (e) {
      console.warn('Failed to restore selected slides:', e);
    }
  }, []);

  useEffect(() => {
    try {
      const arr = selectedOrder.map(k => selectedGlobal.get(k)).filter(Boolean);
      sessionStorage.setItem(SELECTED_STORAGE_KEY, JSON.stringify(arr));
      localStorage.setItem(SELECTED_STORAGE_KEY, JSON.stringify(arr));
    } catch (e) {
      console.warn('Failed to persist selected slides:', e);
    }
  }, [selectedGlobal, selectedOrder]);

  const slideKey = (deckId, slideId) => `${deckId}::${slideId}`;

  const toggleSelect = (deck, slide) => {
    const key = slideKey(deck?.id, slide?.id);

    setSelectedGlobal(prev => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
        setSelectedOrder(ord => ord.filter(k => k !== key));
      } else {
        const entry = {
          key,
          deckId: deck?.id,
          deckTitle: deck?.title,
          slideId: slide?.id,
          title: slide?.title,
          object_id: slide?.object_id,
        };
        next.set(key, entry);
        setSelectedOrder(ord => (ord.includes(key) ? ord : [...ord, key]));
      }
      return next;
    });
  };

  const clearGlobalSelection = () => {
    setSelectedGlobal(new Map());
    setSelectedOrder([]);
  };

  const [toast, setToast] = useState(null);
  const showToast = useCallback((variant, title, description) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setToast({ id, variant, title, description });
    setTimeout(() => {
      setToast(t => (t && t.id === id ? null : t));
    }, 2600);
  }, []);

  const persistUi = useCallback((next = {}) => {
    try {
      const prev = JSON.parse(localStorage.getItem(UI_LS_KEY) || '{}');
      const toSave = {
        ...prev,
        selectedFolder: next.selectedFolder ?? prev?.selectedFolder ?? selectedFolder,
        query: next.query ?? prev?.query ?? query,
        [UI_LAST_DECK_KEY]: (UI_LAST_DECK_KEY in next) ? next[UI_LAST_DECK_KEY] : (prev?.[UI_LAST_DECK_KEY] ?? null),
        [UI_LAST_FOLDER_KEY]: (UI_LAST_FOLDER_KEY in next) ? next[UI_LAST_FOLDER_KEY] : (prev?.[UI_LAST_FOLDER_KEY] ?? null),
      };
      localStorage.setItem(UI_LS_KEY, JSON.stringify(toSave));
    } catch {}
  }, [selectedFolder, query]);

  const restoreUi = useCallback(() => {
    try {
      const raw = localStorage.getItem(UI_LS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }, []);

  const getCachedDecks = () => {
    try {
      const raw = localStorage.getItem(DECKS_CACHE);
      if (!raw) return null;
      const { at, data } = JSON.parse(raw);
      if (!at || !data) return null;
      if (Date.now() - at > DECKS_TTL_MS) return null;
      return Array.isArray(data) ? data : null;
    } catch { return null; }
  };
  const setCachedDecks = (data) => {
    try {
      localStorage.setItem(DECKS_CACHE, JSON.stringify({ at: Date.now(), data }));
    } catch {}
  };

  const getCachedSlides = (deckId) => {
    if (slidesCacheRef.current.has(deckId)) return slidesCacheRef.current.get(deckId);
    try {
      const raw = sessionStorage.getItem(`${cfg.prefix}-slides-${deckId}`);
      if (!raw) return null;
      const { at, data } = JSON.parse(raw);
      if (Date.now() - at > SLIDES_TTL_MS) return null;
      if (Array.isArray(data)) {
        slidesCacheRef.current.set(deckId, data);
        return data;
      }
    } catch {}
    return null;
  };
  const setCachedSlides = (deckId, data) => {
    slidesCacheRef.current.set(deckId, data);
    try {
      sessionStorage.setItem(`${cfg.prefix}-slides-${deckId}`, JSON.stringify({ at: Date.now(), data }));
    } catch {}
  };

  const autoOpenedRef = useRef(false);

  useEffect(() => {
    logger?.logInteraction?.(ActionTypes.SESSION, {
      interaction_type: InteractionTypes.WORKSPACE_VIEW_OPEN,
      component: cfg.logComponent,
      metadata: { view: 'prototype_open', variant, user_id: userId || 'anon' },
    });
    const { selectedFolder: sf, query: q } = restoreUi();
    if (sf) setSelectedFolder(sf);
    if (q) setQuery(q);
  }, [variant, userId, restoreUi]);

  useEffect(() => {
    const cached = getCachedDecks();
    if (cached) {
      const normalized = normalizeC1Folders(cached, { debug: false });
      setFolders(normalized);
      const persisted = restoreUi();
      const candidate =
        persisted?.selectedFolder &&
        normalized.some((f) => f.folder_topic === persisted.selectedFolder)
          ? persisted.selectedFolder
          : normalized[0]?.folder_topic || null;
      setSelectedFolder(candidate);
      persistUi({ selectedFolder: candidate });
      setRevalidatingDecks(true);

      if (!autoOpenedRef.current) {
        const lastDeckId = persisted?.[UI_LAST_DECK_KEY];
        if (lastDeckId) {
          const folderHit = normalized.find(f => (f.decks || []).some(d => d.id === lastDeckId));
          const deckHit = folderHit?.decks?.find(d => d.id === lastDeckId);
          if (folderHit && deckHit) {
            autoOpenedRef.current = true;
            setSelectedFolder(folderHit.folder_topic);
            persistUi({ selectedFolder: folderHit.folder_topic });
            setTimeout(() => openDeck(deckHit), 0);
          }
        }
      }
    } else {
      setLoadingDecks(true);
    }

    setErrorMsg('');
    decksAbortRef.current?.abort();
    const ac = new AbortController();
    decksAbortRef.current = ac;

    callC1Decks()
      .then((raw) => {
        if (ac.signal.aborted) return;
        setCachedDecks(raw);
        const normalized = normalizeC1Folders(raw, { debug: false });
        const persisted = restoreUi();
        const candidate =
          persisted?.selectedFolder &&
          normalized.some((f) => f.folder_topic === persisted.selectedFolder)
            ? persisted.selectedFolder
            : normalized[0]?.folder_topic || null;

        setFolders(normalized);
        setSelectedFolder(candidate);
        persistUi({ selectedFolder: candidate });
        if (!cached) setLoadingDecks(false);

        if (!autoOpenedRef.current) {
          const lastDeckId = persisted?.[UI_LAST_DECK_KEY];
          if (lastDeckId) {
            const folderHit = normalized.find(f => (f.decks || []).some(d => d.id === lastDeckId));
            const deckHit = folderHit?.decks?.find(d => d.id === lastDeckId);
            if (folderHit && deckHit) {
              autoOpenedRef.current = true;
              setSelectedFolder(folderHit.folder_topic);
              persistUi({ selectedFolder: folderHit.folder_topic });
              setTimeout(() => openDeck(deckHit), 0);
            }
          }
        }
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        console.error(`[${cfg.logComponent}] fetch decks failed:`, e);
        if (!cached) setFolders([]);
        setErrorMsg('Could not load decks list.');
        if (!cached) setLoadingDecks(false);
      })
      .finally(() => {
        if (ac.signal.aborted) return;
        setRevalidatingDecks(false);
      });

    return () => ac.abort();
  }, [variant, persistUi, restoreUi]);

  const decksInFolder = useMemo(() => {
    const f = folders.find((x) => x.folder_topic === selectedFolder);
    let decks = f ? (f.decks || []) : [];
    if (query.trim()) {
      const q = query.toLowerCase();
      decks = decks.filter((d) => (d?.title || '').toLowerCase().includes(q));
    }
    return decks;
  }, [folders, selectedFolder, query]);

  const openDeck = useCallback(async (deck) => {
    if (!deck?.id) return;
    setSelectedDeck(deck);
    setErrorMsg('');
    persistUi({ [UI_LAST_DECK_KEY]: deck.id, [UI_LAST_FOLDER_KEY]: selectedFolder });

    const cached = getCachedSlides(deck.id);
    if (cached) {
      setSlides(cached);
      setLoadingSlides(false);

      slidesAbortRef.current?.abort();
      const ac = new AbortController();
      slidesAbortRef.current = ac;
      try {
        const fresh = await callC1DeckSlides(deck.id);
        if (ac.signal.aborted) return;
        const normalized = (fresh || []).map((s) => ({
          ...s,
        }));
        setCachedSlides(deck.id, normalized);
        setSlides(normalized);
      } catch (e) {
        if (!ac.signal.aborted) console.warn(`[${cfg.logComponent}] revalidate slides failed:`, e);
      }
      return;
    }

    setSlides([]);
    setLoadingSlides(true);

    logger?.logInteraction?.(ActionTypes.VISUALIZATION, {
      interaction_type: InteractionTypes.DECK_OPEN,
      component: cfg.logComponent,
      metadata: { deck_id: deck.id, folder: selectedFolder },
    });

    slidesAbortRef.current?.abort();
    const ac = new AbortController();
    slidesAbortRef.current = ac;

    try {
      const rawSlides = await callC1DeckSlides(deck.id);
      if (ac.signal.aborted) return;
      const normalized = (rawSlides || []).map((s) => ({
        ...s,
      }));
      setCachedSlides(deck.id, normalized);
      setSlides(normalized);
    } catch (e) {
      if (!ac.signal.aborted) {
        console.error(`[${cfg.logComponent}] load slides failed:`, e);
        setSlides([]);
        setErrorMsg('Could not load slides for the selected deck.');
      }
    } finally {
      if (!ac.signal.aborted) setLoadingSlides(false);
    }
  }, [selectedFolder, persistUi]);

  const filteredSlides = useMemo(() => {
    if (!selectedDeck) return [];
    if (!query.trim()) return slides;
    const q = query.toLowerCase();
    return slides.filter((s) => (s?.title || '').toLowerCase().includes(q));
  }, [slides, selectedDeck, query]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (showSelectedModal) {
          setShowSelectedModal(false);
          return;
        }
        if (previewObjectId) {
          setPreviewObjectId(null);
          return;
        }
        if (selectedDeck) {
          setSelectedDeck(null);
          persistUi({ [UI_LAST_DECK_KEY]: null });
          return;
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowLeft') {
        if (showSelectedModal) {
          setShowSelectedModal(false);
          return;
        }
        if (selectedDeck) {
          setSelectedDeck(null);
          persistUi({ [UI_LAST_DECK_KEY]: null });
          return;
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSelectedModal, previewObjectId, selectedDeck, persistUi]);

  const stats = useMemo(() => ({
    categories: folders.length,
    decks: (folders.find(x => x.folder_topic === selectedFolder)?.decks || []).length,
    slides: selectedDeck ? filteredSlides.length : 0,
  }), [folders, selectedFolder, selectedDeck, filteredSlides.length]);

  useEffect(() => {
    return () => {
      decksAbortRef.current?.abort();
      slidesAbortRef.current?.abort();
      hoverTimersRef.current.forEach((t) => clearTimeout(t));
      hoverTimersRef.current.clear();
    };
  }, []);

  const isInitialMount = useRef(true);
  useEffect(() => {
    let loaded = null;
    try {
      const s = sessionStorage.getItem(SP_STORAGE_KEY);
      if (s) { const p = JSON.parse(s); if (Array.isArray(p)) loaded = p; }
    } catch {}
    if (!loaded) {
      try {
        const l = localStorage.getItem(SP_STORAGE_KEY);
        if (l) { const p = JSON.parse(l); if (Array.isArray(p)) loaded = p; }
      } catch {}
    }
    if (loaded) setStorypoints(loaded);
  }, []);
  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    try {
      const payload = JSON.stringify(storypoints ?? []);
      sessionStorage.setItem(SP_STORAGE_KEY, payload);
      localStorage.setItem(SP_STORAGE_KEY, payload);
    } catch (e) { console.error('Failed to save storypoints:', e); }
  }, [storypoints]);

  const deckCacheExists = !!getCachedDecks();
  const slidesCacheExists = selectedDeck ? !!getCachedSlides(selectedDeck.id) : false;
  const shouldOverlay =
    (loadingDecks && !deckCacheExists) ||
    (loadingSlides && selectedDeck && !slidesCacheExists);

  const handleExportClick = (orderedKeys) => {
    const keys = (Array.isArray(orderedKeys) && orderedKeys.length)
      ? orderedKeys
      : selectedOrder;

    if (!keys.length) {
      showToast('info', 'Nothing to export', 'Select slides first.');
      return;
    }

    if (orderedKeys?.length) setSelectedOrder(orderedKeys);

    setIsExportOpen(true);
  };

  return (
    <div className="h-[100dvh] overflow-hidden flex flex-col bg-white text-gray-900">
      <div className="pointer-events-none fixed right-4 top-4 z-[100] space-y-2">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ y: -12, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -12, opacity: 0, scale: 0.98 }}
              className={[
                "pointer-events-auto flex items-start gap-2 rounded-2xl border px-4 py-3 shadow-2xl bg-white/90 backdrop-blur",
                toast.variant === 'success' ? "border-emerald-200" :
                toast.variant === 'error' ? "border-red-200" : "border-gray-200"
              ].join(' ')}
            >
              {toast.variant === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
              ) : toast.variant === 'error' ? (
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              ) : (
                <svg className="w-5 h-5 text-gray-600 mt-0.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4"/></svg>
              )}
              <div>
                <div className="text-sm font-semibold text-gray-900">{toast.title}</div>
                {toast.description ? <div className="text-xs text-gray-600 mt-0.5">{toast.description}</div> : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <a href={`#${cfg.prefix}-main`} className="sr-only focus:not-sr-only focus:absolute focus:m-2 focus:rounded focus:bg-emerald-50 focus:px-3 focus:py-2">
        Skip to content
      </a>

      <C1Header
        query={query}
        setQuery={(v) => { setQuery(v); persistUi({ query: v }); }}
        folders={folders}
        selectedFolder={selectedFolder}
        selectedDeck={selectedDeck}
        onClearDeck={() => { setSelectedDeck(null); persistUi({ [UI_LAST_DECK_KEY]: null }); }}
        onSelectFolder={(topic) => {
          setSelectedFolder(topic);
          setSelectedDeck(null);
          setSlides([]);
          persistUi({ selectedFolder: topic, [UI_LAST_DECK_KEY]: null, [UI_LAST_FOLDER_KEY]: topic });
          logger?.logInteraction?.(ActionTypes.VISUALIZATION, {
            interaction_type: InteractionTypes.DECK_FOLDER_SELECT,
            component: cfg.logComponent,
            metadata: { folder: topic },
          });
        }}
        rightSlot={
          <button
            onClick={() => setIsProfileOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 px-2.5 py-1.5 transition-colors"
            aria-label="Account / Sign out"
            title="Account"
          >
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white text-sm font-semibold">
              <User2 className='w-4 h-4' />
            </span>
            <span className="hidden sm:inline text-sm text-gray-900">Account</span>
          </button>
        }
      />

      <div className="sticky top-0 z-30 border-b bg-white/75 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-2 flex items-center gap-3">
          <Badge label="Categories" value={folders.length} />
          <Badge label="Decks" value={(folders.find(x => x.folder_topic === selectedFolder)?.decks || []).length} />
          {selectedDeck ? <Badge label="Slides" value={selectedDeck ? filteredSlides.length : 0} /> : null}
          <div className="ml-auto text-xs text-emerald-700" aria-live="polite">
            {(loadingDecks || revalidatingDecks) && 'Loading decks…'}
            {!loadingDecks && !revalidatingDecks && loadingSlides && 'Loading slides…'}
          </div>
        </div>
        {errorMsg ? (
          <div className="mx-auto max-w-7xl px-4 md:px-6 pb-2">
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex-1 min-h-0 flex gap-0">
        <div className="relative">
          <div className={requiresStoryPointGate ? 'pointer-events-none opacity-50' : ''}>
            <SidebarFolders
              folders={folders}
              selectedFolder={selectedFolder}
              onSelect={(topic) => {
                setSelectedFolder(topic);
                setSelectedDeck(null);
                setSlides([]);
                persistUi({ selectedFolder: topic, [UI_LAST_DECK_KEY]: null, [UI_LAST_FOLDER_KEY]: topic });
                logger?.logInteraction?.(ActionTypes.VISUALIZATION, {
                  interaction_type: InteractionTypes.DECK_FOLDER_SELECT,
                  component: cfg.logComponent,
                  metadata: { folder: topic },
                });
              }}
            />
          </div>
          {requiresStoryPointGate && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] pointer-events-auto border-r border-emerald-100" />
          )}
        </div>

        <div className="relative flex-1 min-h-0">
          <main
            id={`${cfg.prefix}-main`}
            className={`relative flex-1 h-full min-h-0 overflow-y-auto [scrollbar-gutter:stable] ${
              requiresStoryPointGate ? 'pointer-events-none opacity-40' : ''
            }`}
          >
            {shouldOverlay && (
              <LoadingOverlay label={loadingDecks ? 'Loading decks…' : 'Loading slides…'} />
            )}

            <div className="mx-auto max-w-7xl px-4 md:px-6 py-4 md:py-6">
              {!selectedDeck ? (
                loadingDecks ? (
                  <DeckGrid selectedFolder={selectedFolder} decks={[]} loading={true} onOpen={openDeck} />
                ) : (decksInFolder?.length ?? 0) > 0 ? (
                  <DeckGrid
                    selectedFolder={selectedFolder}
                    decks={decksInFolder}
                    loading={revalidatingDecks}
                    onOpen={openDeck}
                  />
                ) : (
                  <EmptyState
                    title={query ? 'No results' : 'No decks in this folder'}
                    subtitle={
                      query ? 'Change the phrase or clear the filter.' : 'Choose another folder or refresh.'
                    }
                    actionLabel={query ? 'Clear filter' : undefined}
                    onAction={query ? () => setQuery('') : undefined}
                  />
                )
              ) : filteredSlides.length > 0 ? (
                <SlideGrid
                  selectedDeck={selectedDeck}
                  filteredSlides={filteredSlides}
                  loading={loadingSlides}
                  onBack={() => {
                    setSelectedDeck(null);
                    persistUi({ [UI_LAST_DECK_KEY]: null });
                  }}
                  onPreview={(objectId) => setPreviewObjectId(objectId)}
                  imgLoading="lazy"
                  imgDecoding="async"
                  selectedKeys={selectedGlobal}
                  onToggleSelect={(slide) => toggleSelect(selectedDeck, slide)}
                />
              ) : (
                <EmptyState
                  title={query ? 'No slides match the filter' : 'This deck has no slides'}
                  subtitle={query ? 'Try a different phrase.' : 'Go back and pick another deck.'}
                  actionLabel={selectedDeck ? 'Back to decks' : undefined}
                  onAction={
                    selectedDeck
                      ? () => {
                          setSelectedDeck(null);
                          persistUi({ [UI_LAST_DECK_KEY]: null });
                        }
                      : undefined
                  }
                />
              )}
            </div>

            <ImageEnlarge
              objectId={previewObjectId}
              isOpen={!!previewObjectId}
              onClose={() => setPreviewObjectId(null)}
            />
          </main>

        {requiresStoryPointGate && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-6">
            <div className="max-w-lg rounded-2xl border border-emerald-200 bg-emerald-50/95 p-6 text-center shadow-lg">
              <p className="text-lg font-semibold text-emerald-900">
                Before you can browse decks or select slides, create between {EXPERIMENTAL_STORYPOINT_MIN} and{' '}
                {EXPERIMENTAL_STORYPOINT_MAX} story points.
              </p>
              <p className="mt-3 text-sm text-emerald-800">{storyPointGateMessage}</p>
              <p className="mt-4 text-xs text-emerald-700">
                Use the Story Points panel on the right to add, edit, or delete story points.
              </p>
            </div>
          </div>
        )}
        </div>

        <div className="h-full min-h-0 overflow-y-auto">
          <StorypointsPanel
            storypoints={storypoints}
            setStorypoints={setStorypoints}
            aiEnabled={cfg.aiEnabled}
            showCreateHint={shouldShowCreateHint}
            createHintText="Start editing your story here"
            showOverviewHint={shouldShowOverviewHint}
            overviewHintText="Start editing your story here"
            suppressHints={isProfileOpen}
          />
        </div>
      </div>

      <ProfileMenu open={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {selectedOrder.length > 0 && (
        <SelectionActionBar
          selectedCount={selectedOrder.length}
          onClear={clearGlobalSelection}
          onExport={handleExportClick}
          onView={() => setShowSelectedModal(true)}
          requiredCount={isExperimentalMode ? 10 : undefined}
        />
      )}

      <SelectedSlidesModal
        open={showSelectedModal}
        items={selectedItemsOrdered}
        onClose={() => setShowSelectedModal(false)}
        onRemove={(key) => {
          setSelectedGlobal(prev => { const n = new Map(prev); n.delete(key); return n; });
          setSelectedOrder(ord => ord.filter(k => k !== key));
        }}
        onClearAll={clearGlobalSelection}
        onExport={(orderKeys) => handleExportClick(orderKeys)}
        onReorder={(orderKeys) => {
          setSelectedOrder(orderKeys.filter(k => selectedGlobal.has(k)));
          setSelectedGlobal(prev => {
            const next = new Map();
            for (const k of orderKeys) {
              const v = prev.get(k);
              if (v) next.set(k, v);
            }
            for (const [k, v] of prev.entries()) {
              if (!next.has(k)) next.set(k, v);
            }
            return next;
          });
        }}
      />

      <ExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        selectedSlides={selectedSet}
        isExperimental={isExperimentalMode}
        storyPoints={storypoints}
        logContext="prototypeC"
        onExport={async (format) => {
          setIsExportOpen(false);
          showToast('success', 'Export started', `Format: ${format.toUpperCase()}`);
        }}
/>
    </div>
  );
}
