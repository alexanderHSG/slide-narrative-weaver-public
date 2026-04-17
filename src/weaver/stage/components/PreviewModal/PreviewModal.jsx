import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, GripVertical } from "lucide-react";
import { generateShortTitleFromDescription } from "@/weaver/signals/lib/storyPoints/generateShortTitleFromDescription";
import { useToast } from "@/weaver/threads/hooks/useToast";
import { Toast } from "../Toast/Toast";
import AlertDialog from "../ui/AlertDialog/AlertDialog";
import StoryPointCard from "../StoryPointCard/StoryPointCard";
import {
  callSaveStoryPoint,
  callRegenerateStoryPoint,
  callDeleteNode,
} from "@/weaver/signals/lib/api/apiClient";
import {
  ActionTypes,
  InteractionTypes,
  InteractionStatus,
  logger,
} from "@/weaver/toolkit/utils/logger/logger";
import { buildManualStoryPointEditLog } from "@/weaver/toolkit/utils/logger/storyPointEditLogs";
import { useUser } from "../UserAccessWrapper/UserAccessWrapper";
import EmptyPreviewState from "./EmptyPreviewState";
import { isAiEnabledFor } from "@/weaver/signals/lib/capabilities/aiGuard";
import { EXPERIMENTAL_STORYPOINT_MIN, EXPERIMENTAL_STORYPOINT_MAX } from "@/weaver/atlas/constants/storyPoints";

const PreviewModal = ({
  isOpen,
  onClose,
  storyPoints,
  setStoryPoints,
  enhanceDescription,
  onRegenerate,
}) => {
  const { chatgptEnabled = true, isExp, prototype } = useUser?.() ?? {};
  const variant = (prototype || "").trim();
  const isC1 = isExp && variant === "C1";
  const isC2 = isExp && variant === 'C2';

  const aiEnabled = isAiEnabledFor({ isExp, prototype: variant, chatgptEnabled });

  const shouldAutoFetchSlides = !isC1 && !isC2;
  const AUTO_SLIDE_REGEN_COUNT = 3;

  window.dispatchEvent(new Event("modal:opened"));

  const [selectedSpId, setSelectedSpId] = useState(null);
  const [, setGeneratePrompt] = useState("");
  const [, setSlideCount] = useState(1);
  const [aiLoading, setAiLoading] = useState(false);
  const [slideLoading, setSlideLoading] = useState(false);
  const [isTitleLoading, setIsTitleLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [editingSpId, setEditingSpId] = useState(null);
  const [refiningSpId, setRefiningSpId] = useState(null);

  const [toast, showToast] = useToast();
  const listRef = useRef();
  const spRefs = useRef({});
  const rightListRef = useRef();
  const dragItem = useRef({ index: null, node: null });
  const isEmpty = !Array.isArray(storyPoints) || storyPoints.length === 0;
  const storyPointCount = Array.isArray(storyPoints) ? storyPoints.length : 0;
  const isGatedPrototype =
    isExp && (variant?.startsWith("I") || variant?.startsWith("C"));
  const storyPointRangeValid =
    storyPointCount >= EXPERIMENTAL_STORYPOINT_MIN &&
    storyPointCount <= EXPERIMENTAL_STORYPOINT_MAX;
  const lockOverview = isGatedPrototype && !storyPointRangeValid;
  const reachedExperimentalCap = isExp && storyPointCount >= EXPERIMENTAL_STORYPOINT_MAX;
  const storyPointRangeMessage =
    storyPointCount < EXPERIMENTAL_STORYPOINT_MIN
      ? `You currently have ${storyPointCount} story point${storyPointCount === 1 ? "" : "s"}. Create at least ${
          EXPERIMENTAL_STORYPOINT_MIN - storyPointCount
        } more to reach the required ${EXPERIMENTAL_STORYPOINT_MIN}–${EXPERIMENTAL_STORYPOINT_MAX} range.`
      : `You currently have ${storyPointCount} story points. Reduce the total to ${EXPERIMENTAL_STORYPOINT_MAX} or fewer before selecting slides.`;
  const handleClose = () => {
    if (lockOverview) return;
    onClose();
  };

  function truncateWords(text, maxWords = 6) {
    if (!text) return "";
    const words = text.trim().split(/\s+/);
    return words.length > maxWords ? words.slice(0, maxWords).join(" ") + "…" : text;
  }

  const handleSelectNode = (sp) => {
    setSelectedSpId(sp.id);
    setGeneratePrompt("");
    setSlideCount(1);
    setTimeout(() => {
      const el = spRefs.current[sp.id];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const dragStart = (_, index) => (dragItem.current.index = index);
  const dragEnter = (_, index) => (dragItem.current.node = index);
  const drop = async () => {
    const list = [...storyPoints];
    const dragged = list[dragItem.current.index];
    list.splice(dragItem.current.index, 1);
    list.splice(dragItem.current.node, 0, dragged);
    dragItem.current = { index: null, node: null };
    setStoryPoints(list);

    await logger.logInteraction(ActionTypes.VISUALIZATION, {
      interaction_type: InteractionTypes.STORYPOINT_REORDER,
      component: "PreviewModal",
      status: InteractionStatus.SUCCESS,
      metadata: { entity: 'storypoint', new_order: list.map((sp) => sp.id) },
    });
  };

  const handleSaveDescription = async (id, newDesc) => {
    const originalBefore = storyPoints.find((s) => s.id ===id);
    if (!newDesc.trim()) return;
    setIsTitleLoading(true);
    setSlideLoading(!isC1 && !isC2);

    showToast("Saving description…", "info", 0);

    try {
      let shortTitle;
      if (!aiEnabled) {
        shortTitle = truncateWords(newDesc, 6);
      } else {
        showToast("Generating short title…", "info", 0);
        const aiTitle = await generateShortTitleFromDescription(newDesc);
        shortTitle = truncateWords(aiTitle, 6);
      }

      setStoryPoints((curr) =>
        curr.map((sp) =>
          sp.id === id ? { ...sp, description: newDesc, shortTitle, slides: [] } : sp
        )
      );

      await callSaveStoryPoint({
        storyPointId: id,
        description: newDesc,
        shortTitle,
        slideCount: 0,
      });

      if (isC1) {
        showToast("Description saved.", "success", 1600);
      } else if (shouldAutoFetchSlides) {
        const COUNT = AUTO_SLIDE_REGEN_COUNT;
        showToast("Regenerating slides…", "info", 0);

        await callRegenerateStoryPoint({
          storyPointId: id,
          refinementPrompt: newDesc,
          slideCount: COUNT,
        });

        showToast("Fetching regenerated slides…", "info", 0);
        if (onRegenerate) {
          await onRegenerate(id, COUNT, newDesc);
        }

        setStoryPoints((curr) =>
          curr.map((sp) =>
            sp.id === id ? { ...sp, description: newDesc, shortTitle } : sp
          )
        );

        showToast("Description saved & slides refreshed!", "success", 2000);
      } else {
        showToast("Description saved.", "success", 1600);
      }

      await logger.logInteraction(
        ActionTypes.CONTENT,
        buildManualStoryPointEditLog({
          interactionType: InteractionTypes.STORYPOINT_EDIT_MANUAL_OVERVIEW,
          component: "PreviewModal",
          storyPointId: id,
          previousDescription: originalBefore?.description || "",
          updatedDescription: newDesc,
          updatedShortTitle: shortTitle,
          requestedSlideCount: shouldAutoFetchSlides ? AUTO_SLIDE_REGEN_COUNT : 0,
          regeneratedSlides: shouldAutoFetchSlides ? AUTO_SLIDE_REGEN_COUNT : 0,
          prototype: variant,
        })
      );
    } catch (err) {
      console.error(err);
      showToast("Failed to save description.", "error", 5000);
      await logger.logInteraction(ActionTypes.CONTENT, {
        interaction_type: InteractionTypes.STORYPOINT_EDIT_MANUAL_OVERVIEW,
        component: "PreviewModal",
        status: InteractionStatus.ERROR,
        input_data: { 
          storyPointId: id, 
          previousDescription: originalBefore?.description || "",
          updatedDescription: newDesc, 
          requestedSlideCount: shouldAutoFetchSlides ? AUTO_SLIDE_REGEN_COUNT : 0,
          prototype: variant 
        },
        output_data: { error: err.message, slideCount: 0 },
      });
    } finally {
      setIsTitleLoading(false);
      setSlideLoading(false);
    }
  };

  const startDelete = (id) => {
    setPendingDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    const id = pendingDeleteId;
    setStoryPoints((prev) => prev.filter((sp) => sp.id !== id));
    if (selectedSpId === id) setSelectedSpId(null);
    setPendingDeleteId(null);
    setShowDeleteConfirm(false);
    try {
      await callDeleteNode(id, "storypoint");
    } catch (e) {
      console.error("Failed to delete storypoint on backend:", e);
    }
  };

  const addStorypoint = async () => {
    const newId = `sp_${Date.now()}_${storyPoints.length}`;
    const newSP = {
      id: newId,
      description: "Description for new story point",
      shortTitle: "New SP",
    };
    setStoryPoints((prev) => [...prev, newSP]);
    setSelectedSpId(newId);
    setTimeout(() => handleSelectNode(newSP), 50);
    await callSaveStoryPoint({
      storyPointId: newId,
      description: newSP.description,
      shortTitle: newSP.shortTitle,
      slideCount: 0,
    });
  };

  const handleRefineAndGenerate = async (id, refinementPromptInput, count) => {
    if (!aiEnabled) {
      showToast("AI is disabled in this prototype.", "info", 2500);
      return;
    }
    if (!refinementPromptInput.trim() || !enhanceDescription) return;

    const original = storyPoints.find((s) => s.id === id);
    let improvedDesc = null;
    if (!original) return;

    setAiLoading(true);
    setSlideLoading(!isC1 && !isC2);

    try {
      showToast("Refining description…", "info", 0);
      improvedDesc = await enhanceDescription(original.description, refinementPromptInput);

      showToast("Generating short title…", "info", 0);
      const aiTitle = await generateShortTitleFromDescription(improvedDesc);
      const shortTitle = truncateWords(aiTitle, 6);

      showToast("Saving updated description…", "info", 0);
      await callSaveStoryPoint({
        storyPointId: id,
        description: improvedDesc,
        shortTitle,
        slideCount: 0,
      });

      setStoryPoints((curr) =>
        curr.map((s) =>
          s.id === id ? { ...s, description: improvedDesc, shortTitle, slides: [] } : s
        )
      );

      if (!isC1) {
        const COUNT = typeof count === "number" ? count : 3;

        showToast("Regenerating slides…", "info", 0);
        await callRegenerateStoryPoint({
          storyPointId: id,
          refinementPrompt: refinementPromptInput,
          slideCount: COUNT,
        });

        showToast("Fetching new slides…", "info", 0);
        if (onRegenerate) {
          await onRegenerate(id, COUNT, refinementPromptInput);
        }

        setStoryPoints((current) =>
          current.map((s) =>
            s.id === id ? { ...s, description: improvedDesc, shortTitle } : s
          )
        );

        showToast("Description refined & slides added!", "success", 2000);
      } else {
        showToast("Description refined!", "success", 1800);
      }

      setRefiningSpId(null);

      await logger.logInteraction(ActionTypes.CONTENT, {
        interaction_type: InteractionTypes.STORYPOINT_EDIT_AI,
        component: "PreviewModal",
        status: InteractionStatus.SUCCESS,
        input_data: {
          storyPointId: id,
            refinementPrompt: refinementPromptInput,
          previousDescription: original?.description || "",
          updatedDescription: improvedDesc,
          slideCount: isC1 ? 0 : (typeof count === "number" ? count : 3),
          prototype: variant,
        },
        metadata: { storyPointId: id },
        output_data: {
          updatedDescription: improvedDesc,
          updatedShortTitle: shortTitle,
          regeneratedSlides: isC1 ? 0 : (typeof count === "number" ? count : 3),
          enlarged: false
        },
      });
    } catch (err) {
      console.error(err);
      showToast(
        isC1 ? "Error refining description." : "Error refining or generating slides.",
        "error",
        5000
      );
      await logger.logInteraction(ActionTypes.CONTENT, {
        interaction_type: InteractionTypes.STORYPOINT_EDIT_AI,
        component: "PreviewModal",
        status: InteractionStatus.ERROR,
        input_data: { 
          storyPointId: id, 
          refinementPrompt: refinementPromptInput,
          updatedDescription: improvedDesc ?? null,
          previousDescription: original?.description || "", 
          prototype: variant 
        },
        output_data: { error: err.message, slideCount: 0 },
      });
    } finally {
      setAiLoading(false);
      setSlideLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 py-4 sm:py-8 md:py-12 lg:py-16"
          style={{ zIndex: 1000 }}
        >
          <motion.div
            initial={{ scale: 0.96, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 20 }}
            className="rounded-2xl shadow-2xl w-full mx-auto flex flex-col overflow-hidden relative
                       max-w-[95vw] sm:max-w-[90vw] md:max-w-[95vw] lg:max-w-[1200px] xl:max-w-[1500px]
                       min-h-[85vh] sm:min-h-[90vh] md:min-h-[92vh] lg:min-h-[96vh]
                       max-h-[85vh] sm:max-h-[90vh] md:max-h-[92vh] lg:max-h-[96vh]"
          >
            <Toast toast={toast} />
            <div className="absolute right-4 md:right-6 top-4 md:top-6 mt-2 group/lock-hint">
              <button
                onClick={handleClose}
                className="p-2 hover:bg-green-100 rounded-full transition-colors disabled:opacity-60"
                aria-label="Close"
                disabled={lockOverview}
              >
                <X className="w-7 h-7 md:w-8 md:h-8 text-gray-800" />
              </button>
              {lockOverview && (
                <div className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 opacity-0 group-hover/lock-hint:opacity-100 transition-opacity duration-200 pr-8">
                  <svg width="360" height="140" viewBox="0 0 360 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="lockHintGradient" x1="0" y1="0" x2="360" y2="0">
                        <stop offset="0" stopColor="#ECFDF5" />
                        <stop offset="1" stopColor="#FFFFFF" />
                      </linearGradient>
                      <filter id="lockHintShadow" x="-15%" y="-20%" width="150%" height="160%">
                        <feDropShadow dx="0" dy="4" stdDeviation="10" floodColor="rgba(5,150,105,0.25)" />
                      </filter>
                    </defs>
                    <path
                      d="M16 35 H285 C295 35 304 41 310 50 L350 80 L310 110 C304 119 295 125 285 125 H16 C8 125 2 119 2 111 V49 C2 41 8 35 16 35 Z"
                      fill="url(#lockHintGradient)"
                      stroke="#059669"
                      strokeWidth="2"
                      filter="url(#lockHintShadow)"
                    />
                    <foreignObject x="30" y="48" width="260" height="70">
                      <div
                        xmlns="http://www.w3.org/1999/xhtml"
                        style={{
                          fontFamily: '"Inter", sans-serif',
                          color: '#065F46',
                          fontSize: '14px',
                          lineHeight: '20px',
                          fontWeight: 600,
                          textAlign: 'left',
                        }}
                      >
                        <p style={{ margin: 0 }}>
                          Before you can select and retrieve a slide, create between {EXPERIMENTAL_STORYPOINT_MIN} and {EXPERIMENTAL_STORYPOINT_MAX} story points.
                        </p>
                        <p
                          style={{
                            margin: '10px 0 0',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: '#047857',
                          }}
                        >
                          {storyPointRangeMessage}
                        </p>
                      </div>
                    </foreignObject>
                  </svg>
                </div>
              )}
            </div>

            <header className="bg-green-50 p-3 sm:p-4 md:p-6 lg:p-8 text-center border-b border-gray-200">
              <h2 className="text-xl sm:text-2xl md:text-2xl lg:text-3xl font-semibold text-green-900">
                Story Points Overview
              </h2>
              <p className="font-semibold text-gray-800 mt-1 text-xs sm:text-sm">
                {aiEnabled
                  ? "Manage, reorder and refine your story points"
                  : "Manage, reorder and create your story points"}
              </p>
            </header>

            {lockOverview && (
              <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 bg-red-50 border-y border-red-200 text-red-800 text-xs sm:text-sm text-center">
                <p className="font-semibold break-words">
                  Story point editing is locked until you create at least {EXPERIMENTAL_STORYPOINT_MIN} story points.
                </p>
                <p className="text-xs mt-1 break-words">{storyPointRangeMessage}</p>
              </div>
            )}

            {isEmpty ? (
              <EmptyPreviewState onAdd={addStorypoint} onClose={onClose} />
            ) : (
              <div className="flex-1 flex flex-col md:flex-row min-h-0">
                <aside className="w-full md:w-96 flex flex-col bg-white relative border-b md:border-b-0 md:border-r border-gray-200">
                  <div
                    ref={listRef}
                    className="flex-1 overflow-y-auto space-y-3 md:space-y-6 px-3 md:px-4 pt-4 pb-2"
                  >
                    {storyPoints.map((sp, idx) => (
                      <div
                        key={sp.id}
                        draggable
                        onDragStart={(e) => dragStart(e, idx)}
                        onDragEnter={(e) => dragEnter(e, idx)}
                        onDragEnd={drop}
                        onClick={() => handleSelectNode(sp)}
                        className={`relative bg-white border ${
                          selectedSpId === sp.id ? "ring-2 ring-green-400" : "border-gray-300"
                        } rounded-lg shadow-sm p-2 sm:p-4 cursor-pointer hover:border-green-400 transition-all`}
                      >
                        <div className="flex items-center">
                          <GripVertical className="w-5 h-5 text-gray-400 -ml-2 mr-1 cursor-move" />
                          <div className="w-7 h-7 flex items-center justify-center rounded-full bg-green-100 text-green-700 font-semibold text-base mr-3">
                            {idx + 1}
                          </div>
                          <p className="truncate font-semibold text-gray-700">
                            {truncateWords(sp.shortTitle || sp.description, 6)}
                            {isTitleLoading && selectedSpId === sp.id && (
                              <span className="ml-2 animate-spin">⏳</span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="sticky bottom-0 bg-white p-3 sm:p-6 border-t border-gray-200">
                    <button
                      onClick={addStorypoint}
                      className="w-full py-2 bg-green-50 border-dashed border-2 border-green-400 text-green-800 rounded-lg hover:bg-green-200 font-semibold disabled:opacity-60"
                      disabled={reachedExperimentalCap}
                      title={
                        reachedExperimentalCap
                          ? `Experimental users can keep up to ${EXPERIMENTAL_STORYPOINT_MAX} story points`
                          : undefined
                      }
                    >
                      + Add Storypoint
                    </button>
                    {reachedExperimentalCap && (
                      <p className="text-xs text-amber-600 mt-2 text-center">
                        Maximum of {EXPERIMENTAL_STORYPOINT_MAX} story points reached. Remove one before adding another.
                      </p>
                    )}
                  </div>
                </aside>

                <section
                  ref={rightListRef}
                  className="flex-1 overflow-y-auto bg-white p-4 md:p-6 space-y-4 md:space-y-6 scroll-smooth"
                >
                  {storyPoints.map((sp) => (
                    <div
                      key={sp.id}
                      ref={(el) => (spRefs.current[sp.id] = el)}
                      style={{ scrollMarginTop: "40px" }}
                      className={selectedSpId === sp.id ? "ring-2 ring-green-400 rounded" : ""}
                    >
                      <StoryPointCard
                        sp={sp}
                        isEditing={editingSpId === sp.id}
                        setEditingSpId={setEditingSpId}
                        onSaveDescription={handleSaveDescription}
                        refiningSpId={refiningSpId}
                        setRefiningSpId={setRefiningSpId}
                        isTitleLoading={isTitleLoading}
                        aiLoading={aiEnabled ? aiLoading : false}
                        slideLoading={slideLoading}
                        onDelete={() => startDelete(sp.id)}
                        toastProps={{ toast, showToast }}
                        onRefineAndGenerate={aiEnabled ? handleRefineAndGenerate : undefined}
                        aiEnabled={aiEnabled}
                      />
                    </div>
                  ))}
                </section>
              </div>
            )}

            {isEmpty ? null : (
              <footer className="p-2 sm:p-3 border-t text-center text-xs text-gray-500 bg-white">
                {aiEnabled
                  ? "Click on a storypoint to expand editing tools. Use AI refinement guidance to improve descriptions quickly."
                  : "Click on a storypoint to expand editing tools."}
              </footer>
            )}

            <AlertDialog
              isOpen={showDeleteConfirm}
              title="Delete Story Point"
              description="Are you sure you want to delete this Story Point? This action cannot be undone."
              onCancel={() => setShowDeleteConfirm(false)}
              onConfirm={handleDelete}
              confirmLabel="Delete"
              cancelLabel="Cancel"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PreviewModal;
