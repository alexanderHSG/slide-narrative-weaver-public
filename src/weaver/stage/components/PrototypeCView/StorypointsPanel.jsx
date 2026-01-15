import { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

const useFloatingAnchor = (targetRef, enabled, canUseDom) => {
  const [anchor, setAnchor] = useState(null);

  useLayoutEffect(() => {
    if (!enabled || !canUseDom) {
      setAnchor(null);
      return;
    }

    const update = () => {
      if (!targetRef.current) {
        setAnchor(null);
        return;
      }
      const rect = targetRef.current.getBoundingClientRect();
      setAnchor({
        top: rect.top + rect.height / 2 + window.scrollY,
        left: rect.left + window.scrollX,
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [targetRef, enabled, canUseDom]);

  return anchor;
};
import { Plus, Eye, LayoutPanelTop, Pencil } from 'lucide-react';
import { useUser } from '../UserAccessWrapper/UserAccessWrapper';
import CreateForm from '../CreateForm/CreateForm';
import PreviewModal from '../PreviewModal/PreviewModal';
import StoryPointEditDialog from '../StoryPointEditDialog/StoryPointEditDialog';

import { enhanceDescription } from '@/weaver/toolkit/utils/enhanceDescription';
import { generateSlidesFromTitle } from '@/weaver/signals/lib/storyPoints/generateSlidesFromTitle';

import { generateShortTitleFromDescription } from '@/weaver/signals/lib/storyPoints/generateShortTitleFromDescription';
import { truncateWords } from '@/weaver/toolkit/utils/truncateWords';
import { safeLogInteraction } from '@/weaver/toolkit/utils/logger/safeLogInteraction';
import { ActionTypes, InteractionStatus, InteractionTypes } from '@/weaver/toolkit/utils/logger/logger';
import { EXPERIMENTAL_STORYPOINT_MIN, EXPERIMENTAL_STORYPOINT_MAX } from '@/weaver/atlas/constants/storyPoints';

export default function StorypointsPanel({
  storypoints,
  setStorypoints,
  enhanceDescription: _unusedEnhanceForPreview,
  onRegenerate: _unusedRegenerateForPreview,
  loading = false,
  showCreateHint = false,
  showOverviewHint = false,
  createHintText = 'Start editing your story here',
  overviewHintText = 'Open your overview to edit story points',
  suppressHints = false,
}) {
  const { chatgptEnabled, isExp, prototype } = useUser?.() ?? { chatgptEnabled: true };
  const FIRST_VIEW_KEY = 'c1-first-view-done';
  const isC1 = !!isExp && prototype === 'C1';
  const isC2 = !!isExp && prototype === 'C2';
  const storyPointCount = Array.isArray(storypoints) ? storypoints.length : 0;
  const reachedExperimentalCap =
    !!isExp && storyPointCount >= EXPERIMENTAL_STORYPOINT_MAX;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSp, setEditingSp] = useState(null);
  const [creating, setCreating] = useState(false);
  const createButtonRef = useRef(null);
  const overviewButtonRef = useRef(null);
  const canUseDom = typeof window !== 'undefined';

  const shouldShowCreateHint =
    isC1 && showCreateHint && !suppressHints && !isCreateOpen && !isPreviewOpen && !creating && !isEditOpen;
  const shouldShowOverviewHint =
    isC2 && showOverviewHint && !suppressHints && !isPreviewOpen && !isEditOpen;

  const createHintAnchor = useFloatingAnchor(createButtonRef, shouldShowCreateHint, canUseDom);
  const overviewHintAnchor = useFloatingAnchor(overviewButtonRef, shouldShowOverviewHint, canUseDom);

  useEffect(() => {
    if (!isC1) return;
    const doneOnce = localStorage.getItem(FIRST_VIEW_KEY) === '1';
    if (!doneOnce && (!Array.isArray(storypoints) || storypoints.length === 0)) {
      setIsCreateOpen(true);
    }
    const onTutorialFinished = () => {
      const nowDone = localStorage.getItem(FIRST_VIEW_KEY) === '1';
      if (!nowDone && (!Array.isArray(storypoints) || storypoints.length === 0)) {
        setIsCreateOpen(true);
      }
    };
    window.addEventListener('tutorial:finished', onTutorialFinished, { once: true });
    return () => window.removeEventListener('tutorial:finished', onTutorialFinished);
  }, [isC1, storypoints]);

  useEffect(() => {
    if (!isC2) return;
    const KEY = 'c2-first-preview-done';
    const doneOnce = localStorage.getItem(KEY) === '1';
    if (!doneOnce) setIsPreviewOpen(true);
    const onTutorialFinished = () => {
      const nowDone = localStorage.getItem(KEY) === '1';
      if (!nowDone) setIsPreviewOpen(true);
    };
    window.addEventListener('tutorial:finished', onTutorialFinished, { once: true });
    return () => window.removeEventListener('tutorial:finished', onTutorialFinished);
  }, [isC2]);

  const handleCreateSubmit = async (formData) => {
    try {
      setCreating(true);

      const nowISO = new Date().toISOString();
      const minCount = isExp ? EXPERIMENTAL_STORYPOINT_MIN : 1;
      const maxCount = isExp ? EXPERIMENTAL_STORYPOINT_MAX : 10;
      const count     = clampInt(formData?.numPoints ?? minCount, minCount, maxCount);
      const topic     = (formData?.topic || '').replace(/['"]+/g, '').trim();
      const descIn    = (formData?.description || '').replace(/['"]+/g, '').trim();
      const goals     = (formData?.goals || '').replace(/['"]+/g, '').trim();
      const guidance  = (formData?.guidancePrompt || '').replace(/['"]+/g, '').trim();
      const outcome   = (formData?.outcome || '').replace(/['"]+/g, '').trim();

      const description = topic || descIn || goals;
      if (!description) return;

      const { storyPointsMap } =
        await generateSlidesFromTitle(description, count, guidance, outcome);

      const pointDescs = [];
      for (let i = 1; i <= count; i++) {
        pointDescs.push(storyPointsMap?.[`Storypoint ${i}`] ?? description);
      }

      const shortTitles = await Promise.all(
        pointDescs.map(d => generateShortTitleFromDescription((d)))
      );

      const newItems = pointDescs.map((desc, i) => {
        const shortTitle = truncateWords(shortTitles[i] || topic || `Story Point ${i + 1}`, 8);
        return {
          id: `sp_${Date.now()}_${i}`,
          title: shortTitle || `Story Point ${i + 1}`,
          shortTitle,
          description: desc,
          definition: desc,
          created_at: nowISO,
          updated_at: nowISO,
          slides: [],
        };
      });

      const createdStoryPointsLog = newItems.map((sp, idx) => ({
        sp_id: sp.id,
        sp_description: sp.description || sp.definition || pointDescs[idx] || '',
        short_title: sp.shortTitle || sp.title || `Story Point ${idx + 1}`,
      }));

      try {
        await safeLogInteraction(ActionTypes.STORY, {
          interaction_type: InteractionTypes.STORY_CREATE,
          component: isC1 ? 'PrototypeC1:StorypointsPanel' : 'PrototypeC2:StorypointsPanel',
          status: InteractionStatus.SUCCESS,
          input_data: {
            topic: description,
            expected_outcome: outcome,
            guidance_used: Boolean(guidance),
            num_points: count,
            prototype: prototype || 'unknown',
          },
          output_data: {
            created_story_points: createdStoryPointsLog,
          },
        });
      } catch (logErr) {
        console.error('[StorypointsPanel] Failed to log story point creation:', logErr);
      }

      setStorypoints(prev => {
        if (!Array.isArray(prev) || prev.length === 0) return newItems;
        if (!formData?.appendToExisting) return newItems;
        const next = [...prev];
        let insertIndex = next.length;
        if (formData?.selectedPointId) {
          const idx = next.findIndex(sp => sp.id === formData.selectedPointId);
          if (idx !== -1) insertIndex = idx + (formData?.insertPosition === 'after' ? 1 : 0);
        }
        next.splice(insertIndex, 0, ...newItems);
        return next;
      });

      setIsCreateOpen(false);
      if (newItems.length > 0 ) {
        requestAnimationFrame(() => setIsPreviewOpen(true));
      }
    } catch (err) {
      console.error('[C1] Create SP via generateSlidesFromTitle failed:', err);
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (sp) => {
    setEditingSp(sp);
    setIsEditOpen(true);
  };

  const handleEditSave = async (
    id,
    newDesc,
    newShortTitle,
    _requestedSlideCount,
    _maybeSlides
  ) => {
    const updatedAt = new Date().toISOString();
    setStorypoints((prev) =>
      prev.map((sp) =>
        sp.id === id
          ? {
              ...sp,
              description: newDesc,
              definition: newDesc,
              shortTitle: newShortTitle || sp.shortTitle,
              title: newShortTitle?.trim() ? newShortTitle.trim() : sp.title,
              updated_at: updatedAt,
            }
          : sp
      )
    );
  };

  const handleRegenerateSlides = async () => {
    return [];
  };

  const hasStorypoints = useMemo(
    () => Array.isArray(storypoints) && storypoints.length > 0,
    [storypoints]
  );

  return (
    <aside className="hidden lg:flex w-[320px] border-l flex-col bg-white relative z-50 overflow-visible">
      <div className="px-4 py-3 border-b bg-white/70 backdrop-blur">
        <div className="flex items-center gap-2">
          <LayoutPanelTop className="w-4 h-4 text-emerald-700" />
          <h3 className="text-sm font-semibold text-gray-900">Story Points</h3>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {isC1 ? 'Create & preview your StoryPoints overview.' : 'Preview & edit your StoryPoints overview.'}
        </p>
      </div>

      <div className="p-4 space-y-3 border-b overflow-visible">
        <div className="relative flex flex-col gap-3 z-40">
          {isC1 && (
            <button
              ref={createButtonRef}
              onClick={() => setIsCreateOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-60"
              disabled={loading || creating || reachedExperimentalCap}
            >
              <Plus className="w-4 h-4" />
              {creating ? 'Creating…' : 'Create Story Points'}
            </button>
          )}

        </div>

        {isC1 && reachedExperimentalCap && (
          <p className="text-xs text-amber-600 text-center">
            Experimental limit reached ({storyPointCount}/{EXPERIMENTAL_STORYPOINT_MAX}). Remove a
            story point before creating a new one.
          </p>
        )}

        <button
          ref={overviewButtonRef}
          onClick={() => setIsPreviewOpen(true)}
          className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors
            ${isC2
              ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm disabled:opacity-60'
              : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200'
            }`}
          title="Open overview"
        >
          <Eye className="w-4 h-4" />
          Open Overview
        </button>
      </div>

      <div className="px-4 py-2 text-xs text-gray-500">Your Story Points</div>
      <div className="px-4 pb-6 space-y-2 overflow-y-auto min-h-0 flex-1">
        {!hasStorypoints ? (
          <div className="text-sm text-gray-500">No story points yet.</div>
        ) : (
          storypoints.map((sp, idx) => (
            <div
              key={sp.id}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 hover:border-emerald-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {(sp.shortTitle && sp.shortTitle.trim()) ||
                      (sp.title && sp.title.trim()) ||
                      `Story Point ${idx + 1}`}
                  </div>

                  {((sp.description && sp.description.trim()) ||
                    (sp.definition && sp.definition.trim())) ? (
                    <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {sp.description?.trim() || sp.definition?.trim()}
                    </div>
                  ) : null}
                </div>

                <button
                  onClick={() => openEdit(sp)}
                  className="self-center shrink-0 inline-flex items-center justify-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                  title="Edit story point"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isC1 && (
        <CreateForm
          isOpen={isCreateOpen}
          onClose={() => {
            setIsCreateOpen(false);
            localStorage.setItem(FIRST_VIEW_KEY, '1');
          }}
          onSubmit={handleCreateSubmit}
          loading={creating}
          storyPoints={storypoints}
        />
      )}

      <PreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          try { localStorage.setItem('c2-first-preview-done', '1'); } catch {}
        }}
        storyPoints={storypoints}
        setStoryPoints={setStorypoints}
        enhanceDescription={enhanceDescription}
        onRegenerate={handleRegenerateSlides}
      />

      {isEditOpen && editingSp && (
        <StoryPointEditDialog
          storyPoint={editingSp}
          onClose={() => {
            setIsEditOpen(false);
            setEditingSp(null);
          }}
          onSave={handleEditSave}
          onRegenerate={handleRegenerateSlides}
          lockedNodes={new Set()}
        />
      )}
      {canUseDom && createHintAnchor &&
        createPortal(
          <svg
            key="create-hint"
            width="260"
            height="70"
            viewBox="0 0 260 70"
            style={{
              position: 'absolute',
              top: createHintAnchor.top - 35,
              left: createHintAnchor.left - 260,
              zIndex: 9999,
              pointerEvents: 'none',
            }}
          >
            <defs>
              <filter id="hintDropCreate" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(15,118,110,0.3)" />
              </filter>
            </defs>
            <path
              d="M10 10 H200 Q210 10 215 15 L240 35 L215 55 Q210 60 200 60 H10 Q5 60 5 55 V15 Q5 10 10 10 Z"
              fill="#fff"
              stroke="#059669"
              strokeWidth="2"
              filter="url(#hintDropCreate)"
            />
            <text x="115" y="40" fill="#065f46" fontSize="14" fontWeight="600" textAnchor="middle">
              {createHintText}
            </text>
          </svg>,
          document.body
        )}

      {canUseDom && overviewHintAnchor &&
        createPortal(
          <svg
            key="overview-hint"
            width="260"
            height="70"
            viewBox="0 0 260 70"
            style={{
              position: 'absolute',
              top: overviewHintAnchor.top - 35,
              left: overviewHintAnchor.left - 260,
              zIndex: 9999,
              pointerEvents: 'none',
            }}
          >
            <defs>
              <filter id="hintDropOverview" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(15,118,110,0.3)" />
              </filter>
            </defs>
            <path
              d="M10 10 H200 Q210 10 215 15 L240 35 L215 55 Q210 60 200 60 H10 Q5 60 5 55 V15 Q5 10 10 10 Z"
              fill="#fff"
              stroke="#059669"
              strokeWidth="2"
              filter="url(#hintDropOverview)"
            />
            <text x="110" y="38" fill="#065f46" fontSize="14" fontWeight="600" textAnchor="middle">
              {overviewHintText}
            </text>
          </svg>,
          document.body
        )}
    </aside>
  );
}

function clampInt(n, min, max) {
  const x = parseInt(n, 10);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}