// StoryPointCard.jsx
import { useState, useEffect } from "react";
import {
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Toast } from "../Toast/Toast";

const StoryPointCard = ({
  sp,
  isEditing,
  setEditingSpId,
  onSaveDescription,
  refiningSpId,
  setRefiningSpId,
  onRefineAndGenerate,
  isTitleLoading,
  aiLoading,
  slideLoading,
  onDelete,
  toastProps,
  aiEnabled = true,
}) => {
  const [localDesc, setLocalDesc] = useState(sp.description);
  const [localRefinementPrompt, setLocalRefinementPrompt] = useState("");

  useEffect(() => setLocalDesc(sp.description), [sp.description]);

  const canUseAI = !!aiEnabled && typeof onRefineAndGenerate === "function";

  const isRefining = refiningSpId === sp.id;

  useEffect(() => {
    if (!canUseAI && isRefining) {
      setRefiningSpId?.(null);
    }
  }, [canUseAI, isRefining, setRefiningSpId]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isEditing) {
        onSaveDescription(sp.id, localDesc);
      } else if (isRefining && canUseAI) {
        onRefineAndGenerate(sp.id, localRefinementPrompt, 3);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <Toast {...toastProps} />

      <header className="flex justify-between items-center">
        <h3 className="text-2xl font-semibold">{sp.shortTitle}</h3>
        <div className="flex gap-2 items-center">
          {canUseAI && (
            <button
              onClick={() => {
                setEditingSpId(null);
                setRefiningSpId(isRefining ? null : sp.id);
              }}
              className={`
                flex items-center px-3 py-1 rounded
                ${isRefining ? "bg-purple-100" : "hover:bg-gray-100"}
              `}
            >
              <Sparkles className="w-4 h-4 mr-1 text-purple-600" />
              <span className="text-sm font-medium text-purple-600">
                Refine with AI
              </span>
              {isRefining ? (
                <ChevronUp className="w-4 h-4 ml-1 text-purple-600" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-1 text-gray-500" />
              )}
            </button>
          )}

          <button
            onClick={() => {
              setRefiningSpId(null);
              setEditingSpId(isEditing ? null : sp.id);
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <Pencil />
          </button>

          <button onClick={() => onDelete(sp.id)} className="p-1 hover:bg-red-100 rounded">
            <Trash2 className="text-red-600" />
          </button>
        </div>
      </header>

      {!isEditing ? (
        <p className="text-gray-700 whitespace-pre-wrap">{sp.description}</p>
      ) : (
        <div className="space-y-2">
          <textarea
            value={localDesc}
            onChange={(e) => setLocalDesc(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-24 p-2 border rounded resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                onSaveDescription(sp.id, localDesc);
                setEditingSpId(null);
              }}
              disabled={isTitleLoading}
              className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
            >
              {isTitleLoading ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => {
                setLocalDesc(sp.description);
                setEditingSpId(null);
              }}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {canUseAI && isRefining && (
        <div className="pt-4">
          <div className="mt-2 space-y-3">
            <input
              type="text"
              value={localRefinementPrompt}
              onChange={(e) => setLocalRefinementPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your refinement guidance (e.g. 'Make it more exciting', 'Add more details', 'Change the perspective')"
              className="w-full p-2 border rounded"
              disabled={aiLoading}
            />

            <button
              onClick={() => onRefineAndGenerate(sp.id, localRefinementPrompt, 3)}
              onKeyDown={handleKeyDown}
              disabled={aiLoading || slideLoading || !localRefinementPrompt.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded disabled:opacity-50 flex items-center justify-center"
            >
              {aiLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {slideLoading ? "Loading…" : "Refine"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryPointCard;
