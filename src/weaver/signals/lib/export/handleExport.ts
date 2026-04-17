import { jsPDF } from 'jspdf';
import {
  callGetSlideDeckInfo,
  callGetImageBase64
} from '../api/apiClient';

type ExportEnv = {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
};

const { VITE_SUPABASE_URL: SUPABASE_URL, VITE_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY } = (
  import.meta as ImportMeta & { env: ExportEnv }
).env;

export type Slide = {
  title: string;
  content: string;
  objectId?: string;
  imageUrl?: string;
};

type HandleExportParams = {
  format: 'pdf' | 'pptx';
  selectedNodes: Set<string>;
  storyPoints: Array<{
    id: string;
    slides?: Array<{
      id: string;
      title?: string;
      content?: string;
      object_id?: string;
    }>;
  }>;
  logger: {
    logInteraction: (
      actionType: string,
      details: Record<string, unknown>
    ) => Promise<void>;
  };
};

export const handleExport = async ({
  format,
  selectedNodes,
  storyPoints,
  logger,
}: HandleExportParams): Promise<void> => {
  if (!selectedNodes.size) {
    console.error('[Export] No slides selected');
    throw new Error('No slides selected for export');
  }

  const normalizeSpId = (id: string) => id?.replace(/-/g, '_');

  const parseNodeId = (
    nodeId: string,
    sps: { id: string; slides?: { id: string }[] }[]
  ): { spId: string; slideId: string } => {
    if (typeof nodeId !== 'string') return { spId: '', slideId: '' };

    if (nodeId.includes('::')) {
      const [left, right] = nodeId.split('::', 2);
      if (left && right) return { spId: normalizeSpId(left), slideId: right };
    }

    const spHit = sps.find(sp => nodeId.startsWith(sp.id + '_'));
    if (spHit) {
      return {
        spId: normalizeSpId(spHit.id),
        slideId: nodeId.slice(spHit.id.length + 1),
      };
    }

    const slideMatch = nodeId.match(/([a-f0-9]{32}_slide_\d+)$/);
    if (slideMatch) {
      const slideId = slideMatch[1];
      const owner = sps.find(sp => sp.slides?.some(sl => String(sl.id) === slideId));
      return { spId: owner ? normalizeSpId(owner.id) : '', slideId };
    }

    const legacy = nodeId.match(/(sp[-_]\d+(?:[-_]\d+)?)_(.+)/);
    if (legacy) {
      return {
        spId: normalizeSpId(legacy[1]),
        slideId: legacy[2],
      };
    }

    return { spId: '', slideId: '' };
  };

  const getSlideById = (slideId: string) => {
    for (const sp of storyPoints) {
      const found = sp.slides?.find(sl => String(sl.id) === slideId);
      if (found) return found;
    }
    return null;
  };

  const slidesToExport: Slide[] = [];

  for (const rawNodeId of selectedNodes) {
    const { spId, slideId } = parseNodeId(rawNodeId, storyPoints);

    let slideObj: any | null = null;

    if (spId) {
      const sp = storyPoints.find(s => normalizeSpId(s.id) === normalizeSpId(spId));
      slideObj = sp?.slides?.find(sl => String(sl.id) === slideId) ?? null;
    }

    if (!slideObj && slideId) {
      slideObj = getSlideById(slideId);
    }

    if (!slideObj) continue;

    slidesToExport.push({
      title:    slideObj.title   || 'Untitled',
      content:  slideObj.content || '',
      objectId: slideObj.object_id,
      imageUrl: slideObj.object_id
        ? `https://slidestorage.s3.eu-north-1.amazonaws.com/${slideObj.object_id}.png`
        : undefined,
    });
  }

  if (!slidesToExport.length) {
    console.error('[Export] No valid slides found', { selectedNodes: [...selectedNodes] });
    throw new Error('No valid slides found in selection');
  }

  if (format === 'pptx') {
    const objectIds = slidesToExport
      .map(s => s.objectId)
      .filter((x): x is string => Boolean(x));

    if (!objectIds.length) {
      throw new Error('No object IDs available for PPTX export');
    }

    const infoArray = await callGetSlideDeckInfo(objectIds);

    const infoByObj: Record<string, { deck_id: string; slide_number: number }> = {};
    infoArray.forEach(({ object_id, deck_id, slide_number }: any) => {
      infoByObj[object_id] = { deck_id, slide_number };
    });

    const slideInputs = slidesToExport.map(slide => {
      const info = slide.objectId ? infoByObj[slide.objectId] : undefined;
      if (!info) {
        console.error('[Export:pptx] Missing slide info for', slide.objectId);
        throw new Error(`Missing slide info for object_id=${slide.objectId}`);
      }
      return {
        url:   `https://slidestorage.s3.eu-north-1.amazonaws.com/${info.deck_id}.pptx`,
        slide: info.slide_number,
      };
    });

    const endpoint = `${SUPABASE_URL}/functions/v1/mergeSlides`;
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey:          SUPABASE_ANON_KEY,
        Authorization:   `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ slideInputs }),
    });

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => null);
      console.error('[Export:pptx] mergeSlides error body:', errBody);
      throw new Error(errBody?.error || `PPTX export failed: ${resp.status}`);
    }

    const arrayBuffer = await resp.arrayBuffer();
    const blob = new Blob([arrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'presentation.pptx';
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    return;
  }

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const w   = pdf.internal.pageSize.getWidth();
  const h   = pdf.internal.pageSize.getHeight();
  const m   = 20;
  const usable = w - m * 2;
  const maxHeight = h - m * 2;

  for (let i = 0; i < slidesToExport.length; i++) {
    const slide = slidesToExport[i];
    if (i > 0) pdf.addPage();

    if (slide.imageUrl) {
      try {
        const img = await callGetImageBase64(slide.imageUrl);
        let imgW = usable;
        let imgH = imgW / (16 / 9);
        if (imgH > maxHeight) {
          imgH = maxHeight;
          imgW = imgH * (16 / 9);
        }
        const imgX = (w - imgW) / 2;
        const imgY = (h - imgH) / 2;
        pdf.addImage(img, 'PNG', imgX, imgY, imgW, imgH);
      } catch (err) {
        console.error('[Export:pdf] getImageBase64 failed for', slide.imageUrl, err);
        pdf.setTextColor(255, 0, 0);
        pdf.text('Image failed to load', w / 2, h / 2, { align: 'center' });
      }
    } else if (slide.content) {
      pdf.setFontSize(14);
      pdf.setTextColor(54, 54, 54);
      const textLines = pdf.splitTextToSize(slide.content, usable);
      const lineHeight = 7;
      const textHeight = textLines.length * lineHeight;
      const startY = (h - textHeight) / 2;
      textLines.forEach((line, idx) => {
        pdf.text(line, w / 2, startY + idx * lineHeight, { align: 'center' });
      });
    }
  }

  pdf.save('presentation.pdf');
};
