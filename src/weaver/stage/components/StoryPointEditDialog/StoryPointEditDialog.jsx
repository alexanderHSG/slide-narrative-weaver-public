import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Wand2, CheckCircle } from "lucide-react";
import { enhanceDescription } from "@/weaver/toolkit/utils/enhanceDescription";
import { generateShortTitleFromDescription } from "@/weaver/signals/lib/storyPoints/generateShortTitleFromDescription";
import { truncateWords } from "@/weaver/toolkit/utils/truncateWords";
import { ActionTypes, InteractionTypes, logger } from "@/weaver/toolkit/utils/logger/logger";
import { buildManualStoryPointEditLog } from "@/weaver/toolkit/utils/logger/storyPointEditLogs";
import { useUser } from "../UserAccessWrapper/UserAccessWrapper";
import { isAiEnabledFor } from "@/weaver/signals/lib/capabilities/aiGuard";

const StoryPointEditDialog = ({
  storyPoint,
  onClose,
  onSave,
  onRegenerate,
  lockedNodes,
  onRemoveFromSelection,
}) => {
  window.dispatchEvent(new Event("modal:opened"));

  const { isExp, prototype, chatgptEnabled } = useUser?.() ?? {};
  const variant = (prototype || "").trim();
  const isC1 = !!isExp && variant === "C1";
  const isC2 = !!isExp && variant === "C2";
  const aiEnabled = isAiEnabledFor({ isExp, prototype: variant, chatgptEnabled });

  const safeSP = storyPoint ?? { id: "", description: "", shortTitle: "", slides: [] };

  const [description, setDescription] = useState(
    (safeSP.description || "").replace(/['"]+/g, "")
  );
  const [shortTitle, setShortTitle] = useState(safeSP.shortTitle || "");
  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [slideCount, setSlideCount] = useState(3); 
  const [regenerationStatus, setRegenerationStatus] = useState("");
  const slideCache = useRef(new Map());
  const lockedSet = lockedNodes instanceof Set ? lockedNodes : new Set();

  useEffect(() => {
    setDescription((storyPoint?.description || "").replace(/['"]+/g, ""));
    setShortTitle(storyPoint?.shortTitle || "");
  }, [storyPoint?.description, storyPoint?.shortTitle]);

  const handleEnhanceDescription = async () => {
    if (!aiEnabled) return;
    if (!refinementPrompt.trim()) {
      setError("Please enter guidance for the AI.");
      return;
    }
    setIsRegenerating(true);
    setError("");
    setRegenerationStatus("Enhancing description...");
    try {
      const newDescription = await enhanceDescription(description, refinementPrompt);
      setDescription(newDescription.replace(/['"]+/g, ""));
      logger.logInteraction(ActionTypes.CONTENT, {
        interaction_type: InteractionTypes.STORYPOINT_EDIT_AI,
        component: "StoryPointEditDialog:EnhanceDescription",
        input_data: { storyPointId: safeSP.id, refinementPrompt },
        output_data: { updatedDescription: newDescription },
      });
      setRegenerationStatus("Description updated!");
      setTimeout(() => setRegenerationStatus(""), 1200);
    } catch (err) {
      console.error("Error enhancing description:", err);
      setError("Failed to enhance description: " + err.message);
      setRegenerationStatus("");
    } finally {
      setIsRegenerating(false);
    }
  };

  const pruneSelectedNodes = (removedIds = []) => {
    if (!removedIds.length) return;
    try {
      if (typeof onRemoveFromSelection === "function") {
        onRemoveFromSelection(removedIds);
      }
      const raw = localStorage.getItem("selectedSlides");
      if (raw) {
        const arr = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
        const next = arr.filter((id) => !removedIds.includes(id));
        localStorage.setItem("selectedSlides", JSON.stringify(next));
      }
    } catch {}
  };

  const handleSave = async () => {
    if (!description.trim()) {
      setError("Description cannot be empty");
      return;
    }

    const descOrig = (safeSP.description || "").replace(/['"]+/g, "");
    const descNew  = description.replace(/['"]+/g, "");
    const currentSlides = Array.isArray(safeSP.slides) ? safeSP.slides : [];
    const currentCountRaw = currentSlides.length;
    const currentCount    = Math.max(currentCountRaw, 1);

    const descChanged  = descOrig !== descNew;
    const countChanged = (isC1 || isC2) ? false : (slideCount !== currentCount);

    const forceNewIfSameCount = !isC1 && !isC2 && slideCount === currentSlides.length;
    const usedAiRefinement = !!(aiEnabled && refinementPrompt.trim());

    if (!descChanged && !countChanged && !forceNewIfSameCount) {
      onClose();
      return;
    }

    let updatedShortTitle = shortTitle;
    let slidesToSave = [];

    setError("");
    setRegenerationStatus("");

    const cacheKey = JSON.stringify({
      id: safeSP.id,
      desc: descNew,
      count: slideCount,
      refinementPrompt,
    });

    setIsSaving(true);
    setRegenerationStatus(aiEnabled ? "Generating short title…" : "Updating title…");

    try {
      if (descChanged) {
        if (aiEnabled) {
          const aiTitle = await generateShortTitleFromDescription(descNew);
          updatedShortTitle = truncateWords(aiTitle, 8);
        } else {
          updatedShortTitle = truncateWords(descNew, 8);
        }
        setShortTitle(updatedShortTitle);
      }

      if (isC1 || isC2) {
        await onSave(safeSP.id, descNew, updatedShortTitle);

        await logger.logInteraction(ActionTypes.CONTENT, {
          interaction_type: InteractionTypes.STORYPOINT_SAVE,
          component: "StoryPointEditDialog",
          metadata: { storyPointId: safeSP.id, mode: isC1 ? "C1" : "C2" },
          input_data: {
            description_changed: descChanged,
            updatedDescription: descNew,
            requested_slide_count: 0,
            used_ai: !!aiEnabled && !!refinementPrompt.trim(),
          },
          output_data: { shortTitle: updatedShortTitle },
        });

        if (descChanged) {
          if (usedAiRefinement) {
            await logger.logInteraction(ActionTypes.CONTENT, {
              interaction_type: InteractionTypes.STORYPOINT_EDIT_AI,
              component: "StoryPointEditDialog",
              metadata: { storyPointId: safeSP.id },
              input_data: {
                storyPointId: safeSP.id,
                previousDescription: storyPoint?.description || "",
                updatedDescription: descNew,
                refinementPrompt: refinementPrompt || null,
              },
            });
          } else {
            await logger.logInteraction(
              ActionTypes.CONTENT,
              buildManualStoryPointEditLog({
                interactionType: InteractionTypes.STORYPOINT_EDIT_MANUAL_CANVAS,
                component: "StoryPointEditDialog",
                storyPointId: safeSP.id,
                previousDescription: storyPoint?.description || "",
                updatedDescription: descNew,
                updatedShortTitle: updatedShortTitle,
                refinementPrompt: refinementPrompt || null,
                requestedSlideCount: 0,
                regeneratedSlides: 0,
                prototype: variant,
              })
            );
          }
        }

        setRegenerationStatus("Saved!");
        setTimeout(() => {
          setRegenerationStatus("");
          onClose();
        }, 800);
        return;
      }

      await onSave(safeSP.id, descNew, updatedShortTitle, slideCount);

      await logger.logInteraction(ActionTypes.CONTENT, {
        interaction_type: InteractionTypes.STORYPOINT_SAVE,
        component: "StoryPointEditDialog",
        metadata: { storyPointId: safeSP.id, mode: "default" },
        input_data: {
          description_changed: descChanged,
          updatedDescription: descNew,
          requested_slide_count: slideCount,
          used_ai: !!aiEnabled && !!refinementPrompt.trim(),
        },
        output_data: { shortTitle: updatedShortTitle },
      });

      const shouldRegenerate = descChanged || countChanged || forceNewIfSameCount;

      const useCache = shouldRegenerate && !forceNewIfSameCount;

      if (useCache && slideCache.current.has(cacheKey)) {
        slidesToSave = slideCache.current.get(cacheKey);
      } else if (shouldRegenerate) {
        setRegenerationStatus("Retrieving new slides…");
        slidesToSave = await onRegenerate(safeSP.id, slideCount, refinementPrompt);
        if (useCache) slideCache.current.set(cacheKey, slidesToSave);

        await logger.logInteraction(ActionTypes.CONTENT, {
          interaction_type: InteractionTypes.SLIDE_REGENERATE,
          component: "StoryPointEditDialog",
          metadata: { storyPointId: safeSP.id },
          input_data: { requested: slideCount, refinementPrompt },
          output_data: { returned: slidesToSave?.length ?? 0 },
        });
      }

      let finalSlides = null;
      if (shouldRegenerate) {
        const lockedIds = new Set(
          currentSlides
            .filter((sl) => lockedSet.has(`${safeSP.id}_${sl.id}`))
            .map((sl) => sl.id)
        );

        const lockedSlides = currentSlides.filter(sl => lockedIds.has(sl.id));

        const newCandidates = Array.isArray(slidesToSave) ? slidesToSave : [];
        const dedupNew = newCandidates.filter(s => !lockedIds.has(s.id));

        const wanted = slideCount;
        const picked = [];

        for (const s of lockedSlides) {
          if (picked.length >= wanted) break;
          if (!picked.some(x => x.id === s.id)) picked.push(s);
        }

        for (const s of dedupNew) {
          if (picked.length >= wanted) break;
          if (!picked.some(x => x.id === s.id)) picked.push(s);
        }

        if (picked.length < wanted) {
          const fallback = currentSlides.filter(
            s => !lockedIds.has(s.id) && !picked.some(x => x.id === s.id)
          );
          for (const s of fallback) {
            if (picked.length >= wanted) break;
            picked.push(s);
          }
        }
        finalSlides = picked.slice(0, wanted);
      }

      if (finalSlides && finalSlides.length > 0) {
        await onSave(safeSP.id, descNew, updatedShortTitle, slideCount, finalSlides);

        const prevNodeIds = new Set(currentSlides.map((s) => `${safeSP.id}_${s.id}`));
        const nextNodeIds = new Set(finalSlides.map((s) => `${safeSP.id}_${s.id}`));
        const removedIds = [...prevNodeIds].filter(id => !nextNodeIds.has(id));
        pruneSelectedNodes(removedIds);

        await logger.logInteraction(ActionTypes.CONTENT, {
          interaction_type: InteractionTypes.SLIDE_ASSIGN_BULK,
          component: "StoryPointEditDialog",
          metadata: { storyPointId: safeSP.id },
          output_data: {
            assignments: finalSlides.map(s => ({
              storypoint_id: safeSP.id,
              slide_id: s?.id,
              object_id: s?.object_id,
            })),
          },
        });
      }

      if (descChanged) {
        if (usedAiRefinement) {
          await logger.logInteraction(ActionTypes.CONTENT, {
            interaction_type: InteractionTypes.STORYPOINT_EDIT_AI,
            component: "StoryPointEditDialog",
            metadata: { storyPointId: safeSP.id },
            input_data: {
              storyPointId: safeSP.id,
              previousDescription: storyPoint?.description || "",
              updatedDescription: descNew,
                refinementPrompt: refinementPrompt || null,
            },
          });
        } else {
          await logger.logInteraction(
            ActionTypes.CONTENT,
            buildManualStoryPointEditLog({
              interactionType: InteractionTypes.STORYPOINT_EDIT_MANUAL_CANVAS,
              component: "StoryPointEditDialog",
              storyPointId: safeSP.id,
              previousDescription: storyPoint?.description || "",
              updatedDescription: descNew,
              updatedShortTitle: updatedShortTitle,
              refinementPrompt: refinementPrompt || null,
              requestedSlideCount: slideCount,
              regeneratedSlides: Array.isArray(finalSlides) ? finalSlides.length : 0,
              prototype: variant,
            })
          );
        }
      }

      setRegenerationStatus(finalSlides?.length ? "Slides updated!" : "Saved!");
      setTimeout(() => { setRegenerationStatus(""); onClose(); }, 800);
    } catch (err) {
      setError("Failed to save: " + err.message);
      setRegenerationStatus("");
    } finally {
      setIsSaving(false);
    }
  };

  if (!storyPoint) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden mx-4"
      >
        <div className="flex items-center justify-between p-6 bg-green-50">
          <h2 className="text-xl font-semibold text-green-800">
            Edit Story Point Description
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#efe1d1] rounded-full transition-colors"
            disabled={isSaving || isRegenerating}
          >
            <X className="w-5 h-5 text-green-800" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Story Point Description
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value.replace(/['"]+/g, ""));
                setError("");
              }}
              className="w-full h-32 p-4 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 story-point-description-input"
              placeholder="Enter Story Point Description..."
              disabled={isRegenerating || isSaving}
            />
          </div>

          {aiEnabled && (
            <>
              <div className="mt-2 mb-1">
                <input
                  type="text"
                  value={refinementPrompt}
                  onChange={(e) =>
                    setRefinementPrompt(e.target.value.replace(/['"]+/g, ""))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isRegenerating && !isSaving) {
                      e.preventDefault();
                      handleEnhanceDescription();
                    }
                  }}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter refinement guidance, e.g.: 'make it more concise', 'make it more detailed'"
                  disabled={isRegenerating || isSaving}
                />
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {!isC1 && (
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">
                      Number<span className="mx-1">of</span>slides to retrieve:
                    </label>
                    <select
                      value={slideCount}
                      onChange={(e) => setSlideCount(parseInt(e.target.value))}
                      className="border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      disabled={isRegenerating || isSaving}
                    >
                      {[...Array(20)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={handleEnhanceDescription}
                  disabled={isRegenerating || isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
                >
                  <Wand2 className={`w-4 h-4 ${isRegenerating ? "animate-spin" : ""}`} />
                  {isRegenerating ? "Working..." : "Prompt Inspira AI"}
                </button>
              </div>
            </>
          )}

          {!aiEnabled && !isC1 && !isC2 && (
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">
                Number<span className="mx-1">of</span>slides to retrieve:
              </label>
              <select
                value={slideCount}
                onChange={(e) => setSlideCount(parseInt(e.target.value))}
                className="border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                disabled={isRegenerating || isSaving}
              >
                {[...Array(20)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>
          )}

          {regenerationStatus && (
            <div className="mt-2 text-sm bg-purple-50 text-purple-700 p-3 rounded-lg flex items-center">
              <div className="mr-2">
                {isSaving || isRegenerating ? (
                  <div className="w-4 h-4 border-2 border-purple-700 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
              </div>
              {regenerationStatus}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            disabled={isSaving || isRegenerating}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            disabled={isSaving || isRegenerating}
          >
            {isSaving && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            )}
            {isSaving ? (isC1 ? "Saving..." : "Retrieving...") : (isC1 ? "Save" : "Save and Retrieve")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default StoryPointEditDialog;
