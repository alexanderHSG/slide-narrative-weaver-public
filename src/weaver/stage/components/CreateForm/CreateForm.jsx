import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, X, Network as NetworkIcon } from 'lucide-react';
import { useUser } from '../UserAccessWrapper/UserAccessWrapper';
import { EXPERIMENTAL_STORYPOINT_MAX, EXPERIMENTAL_STORYPOINT_MIN } from '@/weaver/atlas/constants/storyPoints';

const CreateForm = ({ isOpen, onClose, onSubmit, loading, storyPoints }) => {
  const { isExp, prototype } = useUser?.() ?? {};
  const isI2 = isExp && prototype === 'I2';
  const isC2 = isExp && prototype === 'C2';

  if (isI2 || isC2) return null;

  window.dispatchEvent(new Event('modal:opened'));

  const requiresExperimentalRange = Boolean(isExp);
  const baseStoryPointOptions = Array.from({ length: 10 }, (_, idx) => idx + 1);
  const storyPointOptions = baseStoryPointOptions;
  const storyPointCount = Array.isArray(storyPoints) ? storyPoints.length : 0;
  const missingStoryPoints = Math.max(EXPERIMENTAL_STORYPOINT_MIN - storyPointCount, 0);
  const forceStayInModal =
    requiresExperimentalRange && storyPointCount < EXPERIMENTAL_STORYPOINT_MIN;
  const exitRequirementMessage = `Create at least ${EXPERIMENTAL_STORYPOINT_MIN} story points before you can exit this modal.`;
  const exitRequirementDetails = `You currently have ${storyPointCount} story point${
    storyPointCount === 1 ? '' : 's'
  }. Create ${missingStoryPoints} more.`;

  const [formData, setFormData] = useState({
    topic: '',
    goals: '',
    outcome: '',
    numPoints: requiresExperimentalRange ? '' : 1,
    appendToExisting: false,
    selectedPointId: '',
    insertPosition: 'after',
    guidancePrompt: '',
  });

  useEffect(() => {
    if (isOpen && requiresExperimentalRange) {
      setFormData(prev => ({ ...prev, numPoints: '' }));
    }
  }, [isOpen, requiresExperimentalRange]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = event => {
      if (forceStayInModal && event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [forceStayInModal, isOpen]);

  const handleSubmit = async e => {
    e.preventDefault();
    const lastExistingPoint =
      formData.appendToExisting && storyPoints.length > 0
        ? formData.selectedPointId
          ? storyPoints.find(sp => sp.id === formData.selectedPointId)
          : storyPoints[storyPoints.length - 1]
        : null;

    const normalizedNumPoints =
      typeof formData.numPoints === 'number'
        ? formData.numPoints
        : parseInt(formData.numPoints || '0', 10);

    if (
      Number.isNaN(normalizedNumPoints) ||
      normalizedNumPoints < 1 ||
      normalizedNumPoints > EXPERIMENTAL_STORYPOINT_MAX
    ) {
      return;
    }

    onSubmit({
      ...formData,
      numPoints: normalizedNumPoints,
      appendToExisting: formData.appendToExisting,
      referencePoint: lastExistingPoint,
      ...(formData.appendToExisting
        ? {
            selectedPointId: formData.selectedPointId,
            insertPosition: formData.insertPosition,
            insertIndex: lastExistingPoint
              ? storyPoints.findIndex(sp => sp.id === lastExistingPoint.id) +
                (formData.insertPosition === 'after' ? 1 : 0)
              : storyPoints.length,
          }
        : {}),
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
          >
            <div className="bg-gradient-to-br from-green-700 to-green-900 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <NetworkIcon className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Create Story Points</h2>
                </div>
                <div className="relative group">
                  <button
                    onClick={() => {
                      if (!forceStayInModal) onClose();
                    }}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={forceStayInModal}
                  >
                    <X className="w-5 h-5" />
                  </button>
                  {forceStayInModal && (
                    <div className="pointer-events-none absolute right-0 top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-white shadow-xl rounded-lg border border-emerald-100 px-4 py-3 w-64">
                        <p className="text-sm font-semibold text-emerald-900 leading-snug">
                          {exitRequirementMessage}
                        </p>
                        <p className="text-xs text-emerald-700 mt-1">{exitRequirementDetails}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Topic</label>
                    <input
                      type="text"
                      value={formData.topic}
                      onChange={e => {
                        setFormData(prev => ({
                          ...prev,
                          topic: e.target.value.replace(/['"]+/g, ''),
                        }));
                      }}
                      onKeyDown={e => {
                        if (e.key === ' ') {
                          e.preventDefault();
                          const cursorPosition = e.target.selectionStart;
                          const textBeforeCursor = formData.topic.slice(0, cursorPosition);
                          const textAfterCursor = formData.topic.slice(cursorPosition);
                          setFormData(prev => ({
                            ...prev,
                            topic: textBeforeCursor + ' ' + textAfterCursor,
                          }));
                          setTimeout(() => {
                            e.target.selectionStart = e.target.selectionEnd = cursorPosition + 1;
                          }, 0);
                        }
                      }}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter topic..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Story Points</label>
                    <div className="flex gap-3">
                      <select
                        value={formData.numPoints}
                        onChange={e => {
                          const value = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            numPoints: value === '' ? '' : parseInt(value, 10),
                          }));
                        }}
                        className={`w-24 p-2.5 bg-gray-50 border rounded-lg ${
                          requiresExperimentalRange ? 'border-emerald-300' : 'border-gray-200'
                        }`}
                      >
                        {requiresExperimentalRange && (
                          <option value="" disabled>
                            Select
                          </option>
                        )}
                        {storyPointOptions.map(num => (
                          <option key={num} value={num}>
                            {num}
                          </option>
                        ))}
                      </select>
                      <span className="text-sm text-gray-500 leading-loose">story points</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Expected Outcome</label>
                    <textarea
                      value={formData.outcome}
                      onChange={e => {
                        setFormData(prev => ({
                          ...prev,
                          outcome: e.target.value.replace(/['"]+/g, ''),
                        }));
                      }}
                      onKeyDown={e => {
                        if (e.key === ' ') {
                          e.preventDefault();
                          const cursorPosition = e.target.selectionStart;
                          const textBeforeCursor = formData.outcome.slice(0, cursorPosition);
                          const textAfterCursor = formData.outcome.slice(cursorPosition);
                          setFormData(prev => ({
                            ...prev,
                            outcome: textBeforeCursor + ' ' + textAfterCursor,
                          }));
                          setTimeout(() => {
                            e.target.selectionStart = e.target.selectionEnd = cursorPosition + 1;
                          }, 0);
                        }
                      }}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg h-32 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="What should be achieved?"
                      required
                    />
                  </div>
                  {storyPoints?.length > 0 && (
                    <div className="space-y-3 bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="appendToExisting"
                          checked={formData.appendToExisting}
                          onChange={e =>
                            setFormData(prev => ({
                              ...prev,
                              appendToExisting: e.target.checked,
                              selectedPointId: '',
                              insertPosition: 'after',
                            }))
                          }
                          className="w-4 h-4 text-green-600 border-gray-300 rounded"
                        />
                        <label htmlFor="appendToExisting" className="text-sm">
                          Append to existing network
                        </label>
                      </div>
                      {formData.appendToExisting && (
                        <div className="space-y-3 ml-6">
                          <div>
                            <label className="block text-sm font-medium mb-1.5">
                              Insert Location
                            </label>
                            <select
                              value={formData.selectedPointId}
                              onChange={e =>
                                setFormData(prev => ({
                                  ...prev,
                                  selectedPointId: e.target.value,
                                }))
                              }
                              className="w-full p-2.5 bg-white border border-gray-200 rounded-lg"
                            >
                              <option value="">At the end of network</option>
                              {storyPoints.map((point, index) => (
                                <option key={point.id} value={point.id}>
                                  SP #{index + 1}:{' '}
                                  {point.description
                                    ? point.description.length > 30
                                      ? point.description.substring(0, 30) + '...'
                                      : point.description
                                    : `Story Point ${index + 1}`}
                                </option>
                              ))}
                            </select>
                          </div>
                          {formData.selectedPointId && (
                            <div>
                              <label className="block text-sm font-medium mb-1.5">Position</label>
                              <select
                                value={formData.insertPosition}
                                onChange={e =>
                                  setFormData(prev => ({
                                    ...prev,
                                    insertPosition: e.target.value,
                                  }))
                                }
                                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg"
                              >
                                <option value="before">Before selected point</option>
                                <option value="after">After selected point</option>
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                      {!formData.appendToExisting && (
                        <div className="text-xs text-red-600 ml-6">
                          Warning: Creating new network will delete existing one
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => {
                      if (!forceStayInModal) onClose();
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={loading || forceStayInModal}
                  >
                    Cancel
                  </button>
                  {forceStayInModal && (
                    <div className="pointer-events-none absolute right-0 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-white shadow-xl rounded-lg border border-emerald-100 px-4 py-3 w-64">
                        <p className="text-sm font-semibold text-emerald-900 leading-snug">
                          {exitRequirementMessage}
                        </p>
                        <p className="text-xs text-emerald-700 mt-1">{exitRequirementDetails}</p>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-200 disabled:shadow-none"
                  disabled={
                    loading ||
                    (requiresExperimentalRange && typeof formData.numPoints !== 'number')
                  }
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Create Story Points</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreateForm;
