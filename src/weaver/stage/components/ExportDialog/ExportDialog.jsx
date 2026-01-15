import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Download, Lock, CheckCircle2 } from 'lucide-react';
import { ActionTypes, InteractionTypes, InteractionStatus } from '@/weaver/toolkit/utils/logger/logger';
import { safeLogInteraction } from '@/weaver/toolkit/utils/logger/safeLogInteraction';
import StudyCodeModal from '../StudyCodeModal/StudyCodeModal';
import { useUser } from '../UserAccessWrapper/UserAccessWrapper';

const STUDY_PASSWORD = 'InspiraStudy2025';

const sanitizeText = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const formatScore = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return Number(value.toFixed(3));
};

const canonicalSlideIdFromSlide = (slide) =>
  sanitizeText(slide?.originalId) ||
  sanitizeText(slide?.id) ||
  sanitizeText(slide?.object_id) ||
  sanitizeText(slide?.slide_id) ||
  null;

const normalizeRawSlideToken = (value) => {
  const text = sanitizeText(value);
  if (!text) return null;
  if (text.includes('::')) {
    const parts = text.split('::');
    return parts[parts.length - 1] || null;
  }
  return text;
};

const normalizeSpIdentifier = (value) => {
  const text = sanitizeText(value);
  return text ? text.replace(/-/g, '_') : null;
};

const extractSlideScore = (slide) => {
  if (typeof slide?.score === 'number') return formatScore(slide.score);
  if (typeof slide?.similarity === 'number') return formatScore(slide.similarity);
  if (typeof slide?.percentage === 'number') return formatScore(slide.percentage / 100);
  return null;
};

const extractSpId = (id) => {
  if (typeof id !== 'string') return 'sp_unknown';
  const match = id.match(/(sp[-_]\d+(?:[-_]\d+)?)/i);
  if (match) return normalizeSpIdentifier(match[1]) || 'sp_unknown';
  if (id.startsWith('sp-') || id.startsWith('sp_')) {
    return normalizeSpIdentifier(id) || 'sp_unknown';
  }
  return 'sp_unknown';
};

const mapCounts = (grouped) =>
  Object.fromEntries(Object.entries(grouped).map(([sp, arr]) => [sp, arr.length]));

export default function ExportDialog({
  isOpen,
  onClose,
  selectedSlides,
  onExport,
  isExperimental = false,
  storyPoints = [],
  logContext = 'default',
}) {
  const isPrototypeCLog = logContext === 'prototypeC';
  const [exportFormat, setExportFormat] = useState('pptx');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [showStudyCode, setShowStudyCode] = useState(false);
  const { prototype } = useUser();

  function sanitizeDescription(sp) {
    const candidates = [
      sp?.description,
      sp?.definition,
      sp?.content,
      sp?.title,
      sp?.shortTitle,
    ];
    for (const candidate of candidates) {
      const text = sanitizeText(candidate);
      if (text) return text;
    }
    return null;
  }

  const { slideLookup, spLookup, storyPointsSummary, slideScoreLookup } = useMemo(() => {
    const aliasMap = new Map();
    const spMap = new Map();
    const summaryList = [];
    const scoreMap = new Map();
    (Array.isArray(storyPoints) ? storyPoints : []).forEach(sp => {
      const normalizedSpId = normalizeSpIdentifier(sp?.id);
      const canonicalSpId = normalizedSpId || sanitizeText(sp?.id) || null;
      const slides = Array.isArray(sp?.slides) ? sp.slides : [];
      const canonicalSlides = [];
      slides.forEach(slide => {
        const canonical = canonicalSlideIdFromSlide(slide);
        if (!canonical) return;
        canonicalSlides.push(canonical);
        const rawScore = extractSlideScore(slide);
        if (rawScore != null) scoreMap.set(canonical, rawScore);
        [
          slide?.id,
          slide?.originalId,
          slide?.object_id,
          slide?.slide_id,
          canonical,
        ].forEach(candidate => {
          const normalizedKey = normalizeRawSlideToken(candidate);
          if (normalizedKey) aliasMap.set(normalizedKey, canonical);
        });
      });
      const uniqueSlideIds = Array.from(new Set(canonicalSlides));
      const summary = {
        sp_id: canonicalSpId,
        sp_description: sanitizeDescription(sp),
        short_title: sanitizeText(sp?.shortTitle) || sanitizeText(sp?.title) || null,
        slide_count: uniqueSlideIds.length,
        slide_ids: uniqueSlideIds,
      };
      summaryList.push(summary);
      const aliasCandidates = new Set();
      [sp?.id, canonicalSpId].forEach(alias => {
        const text = sanitizeText(alias);
        if (text) {
          aliasCandidates.add(text);
          if (text.includes('-')) aliasCandidates.add(text.replace(/-/g, '_'));
          if (text.includes('_')) aliasCandidates.add(text.replace(/_/g, '-'));
        }
      });
      aliasCandidates.forEach(alias => spMap.set(alias, summary));
      if (summary.sp_id) spMap.set(summary.sp_id, summary);
    });
    return { slideLookup: aliasMap, spLookup: spMap, storyPointsSummary: summaryList, slideScoreLookup: scoreMap };
  }, [storyPoints]);

  const resolveSlideId = (raw) => {
    const normalized = normalizeRawSlideToken(raw);
    if (!normalized) return 'slide_unknown';
    const fromLookup = slideLookup.get(normalized) || slideLookup.get(normalized.replace(/-/g, '_'));
    if (fromLookup) return fromLookup;
    const m = normalized.match(/([a-z0-9]{8,}_slide_\d+)/i);
    if (m) return m[1];
    return normalized;
  };

  const getOrderedSelectedIds = () => {
    const asArray = Array.from(selectedSlides || []);
    if (asArray.length === 0) return asArray;
    try {
      const stored = JSON.parse(localStorage.getItem('selectedSlidesOrder') || '[]');
      if (Array.isArray(stored) && stored.length) {
        const currentSet = new Set(asArray);
        const ordered = stored.filter(id => currentSet.has(id));
        asArray.forEach(id => {
          if (!ordered.includes(id)) ordered.push(id);
        });
        return ordered;
      }
    } catch {}
    return asArray;
  };

  function groupSlidesByStoryPoint(rawIds, scoreLookup) {
    const buckets = {};
    (rawIds || []).forEach(raw => {
      const sp = extractSpId(raw);
      const slideId = resolveSlideId(raw);
      if (!slideId || slideId === 'slide_unknown') return;
      if (!buckets[sp]) buckets[sp] = { list: [], seen: new Set() };
      if (buckets[sp].seen.has(slideId)) return;
      buckets[sp].list.push({ slide_id: slideId, score: scoreLookup.get(slideId) ?? null });
      buckets[sp].seen.add(slideId);
    });
    return Object.fromEntries(
      Object.entries(buckets).map(([sp, { list }]) => [sp, list])
    );
  }

  function buildLogPayloadBase() {
    const selectedIds = getOrderedSelectedIds();
    const selected_slide_ids = selectedIds
      .map(resolveSlideId)
      .filter(id => id && id !== 'slide_unknown');
    const selected_slide_ids_unique = Array.from(new Set(selected_slide_ids));
    const grouped = groupSlidesByStoryPoint(selectedIds, slideScoreLookup);
    const slides_by_storypoint = isPrototypeCLog
      ? Object.fromEntries(
          Object.entries(grouped).filter(([spId]) => spId !== 'sp_unknown')
        )
      : grouped;
    const slides_count_by_storypoint = mapCounts(slides_by_storypoint);
    const selectedSlidesBySp = Object.fromEntries(
      Object.entries(slides_by_storypoint).map(([sp, entries]) => [
        sp,
        entries.map(entry => entry?.slide_id).filter(Boolean),
      ])
    );

    const storypointsPayload = storyPointsSummary.map(sp => {
      const selectedForSp = selectedSlidesBySp[sp.sp_id] || [];
      const entry = {
        sp_id: sp.sp_id,
        short_title: sp.short_title,
        sp_description: sp.sp_description,
        slides_selected_count: selectedForSp.length,
      };
      if (!isPrototypeCLog) {
        entry.all_slide_ids = sp.slide_ids;
        entry.selected_slide_ids = selectedForSp;
      }
      return entry;
    });

    if (!isPrototypeCLog) {
      Object.entries(selectedSlidesBySp).forEach(([spId, selectedSlides]) => {
        const alreadyTracked = storypointsPayload.some(sp => sp.sp_id === spId);
        if (alreadyTracked) return;
        storypointsPayload.push({
          sp_id: spId,
          short_title: null,
          sp_description: null,
          all_slide_ids: selectedSlides,
          selected_slide_ids: selectedSlides,
          slides_selected_count: selectedSlides.length,
        });
      });
    }

    return {
      prototype: prototype || 'unknown',
      selected_slide_ids,
      selected_slide_ids_unique,
      user_mode: isExperimental ? 'experimental' : 'named',
      export_format: exportFormat,
      selected_slides_count: selected_slide_ids.length,
      selected_slides_unique_count: selected_slide_ids_unique.length,
      storypoints: storypointsPayload,
      slides_by_storypoint,
      slides_count_by_storypoint,
    };
  }

  useEffect(() => {
    if (!isOpen) return;
    window.dispatchEvent(new Event('modal:opened'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedCount = selectedSlides?.size ?? 0;
  const requiredCount = isExperimental ? 10 : null;
  const isExportDisabled =
    isExporting || selectedCount === 0 || (requiredCount !== null && selectedCount !== requiredCount);

  const logFinal = (status, extra = {}) =>
    safeLogInteraction(ActionTypes.EXPORT, {
      interaction_type: InteractionTypes.EXPORT_COMPLETE,
      component: 'ExportDialog',
      status,
      input_data: buildLogPayloadBase(),
      metadata: extra,
    });

  const handleExperimentalExport = async () => {
    if (selectedCount !== 10) {
      const error = new Error('Study rule: please select exactly 10 slides.');
      error.reason = 'count_mismatch';
      throw error;
    }
    setShowStudyCode(true);
    return { blocked_download: true, reason: 'experimental_track_only', study_code_shown: true };
  };

  const handleRegularExport = async () => {
    await onExport(exportFormat);
    return { blocked_download: false };
  };

  const handleExportClick = async () => {
    setIsExporting(true);
    setError('');
    await new Promise((res) => setTimeout(res, 0));

    let finalStatus = InteractionStatus.SUCCESS;
    let finalMetadata = {};
    try {
      finalMetadata = await (isExperimental ? handleExperimentalExport() : handleRegularExport());
    } catch (e) {
      finalStatus = InteractionStatus.ERROR;
      const reason = e?.reason || (isExperimental ? 'experimental_blocked' : 'export_failed');
      finalMetadata = {
        blocked_download: !!isExperimental,
        reason,
        message: e?.message || 'Export failed',
        ...(e?.metadata || {}),
      };
      setError(e?.message || 'Export failed');
    } finally {
      await logFinal(finalStatus, finalMetadata);
      setIsExporting(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      >
        <motion.div
          initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
          className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4"
        >
          <div className="p-6 border-b bg-green-50">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-green-800">
                {isExperimental ? 'Export (Study Mode)' : 'Export Presentation'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#efe1d1] rounded-full transition-colors"
                disabled={isExporting}
              >
                <X className="w-5 h-5 text-green-800" />
              </button>
            </div>
            <p className="mt-2 text-sm text-green-700">
              {selectedCount} slide{selectedCount !== 1 ? 's' : ''} selected for export
            </p>
          </div>

          <div className="p-6 space-y-6">
            {!isExperimental ? (
              <div className="space-y-2">
                <label htmlFor="exportFormat" className="block text-sm font-medium text-gray-700">
                  Export Format
                </label>
                <select
                  id="exportFormat"
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  disabled={isExporting}
                >
                  <option value="pptx">PowerPoint (.pptx)</option>
                  <option value="pdf">PDF Document (.pdf)</option>
                </select>
              </div>
            ) : selectedCount === 10 ? (
              <div
                role="status"
                className="p-3 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 flex items-start gap-2"
              >
                <CheckCircle2 className="w-6 h-6" />
                <div>
                  <b>Exactly 10 slides selected.</b> Click <b>Export</b> to reveal your study password.
                </div>
              </div>
            ) : (
              <div
                role="alert"
                className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 flex items-start gap-2"
              >
                <Lock className="w-6 h-6" />
                <div>
                  Select <b>exactly 10 slides</b> and click Export to reveal your study password.
                  You have currently selected <b>{selectedCount}</b> slides.
                </div>
              </div>
            )}

            {error && <div className="text-red-600 text-sm">{error}</div>}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isExporting}
              >
                Cancel
              </button>
              <button
                data-export-button
                onClick={handleExportClick}
                disabled={isExportDisabled}
                title={
                  isExperimental && selectedCount !== 10
                    ? 'Study mode: select exactly 10 slides'
                    : selectedCount === 0
                      ? 'Select at least one slide'
                      : undefined
                }
                className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Working…</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>Export</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <StudyCodeModal
        isOpen={showStudyCode}
        onClose={() => setShowStudyCode(false)}
        code={STUDY_PASSWORD}
      />
    </>
  );
}
