import { useEffect } from 'react';

export function syncNetworkWithState(networkRef, storyPoints) {}

const FN_PATH = '/.netlify/functions/slide';

function sanitizeId(v) {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  if (/^[A-Za-z0-9._-]+$/.test(trimmed)) return trimmed;
  if (/^SP_\d+_\d+_slide_\d+$/.test(trimmed)) {
    const parts = trimmed.split('_');
    if (parts[1]) return parts[1];
  }
  const m = trimmed.match(/([A-Za-z0-9._-]{6,})/g);
  return m && m.length ? m[0] : null;
}

function buildSlideUrl(objectId) {
  return objectId ? `${FN_PATH}?objectId=${encodeURIComponent(objectId)}` : null;
}

export function loadSlideImages(networkRef, showImages = true) {
  if (!networkRef?.current) return;

  const nodes = networkRef.current.body.data.nodes;
  const allNodes = nodes.get().filter(node => node.group === 'slide');
  console.log(`Attempting to load images for ${allNodes.length} slide nodes`);

  const fallbackImage =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  allNodes.forEach(async node => {
    const rawId =
      node.slideData?.object_id ||
      node.slideData?.objectId ||
      (typeof node.id === 'string' ? node.id.replace(/^.*_slide_(\d+)$/, '$1') : null);

    const objectId = sanitizeId(rawId);

    if (!objectId || !showImages) {
      console.warn(`Slide node ${node.id} missing/disabled image source, rendering as box`);
      fallbackToBoxShape(nodes, node);
      return;
    }

    const proxyUrl = buildSlideUrl(objectId);

    const img = new Image();
    img.onload = () => {
      if (img.width > 0 && img.height > 0) {
        console.log(`✅ Image loaded for slide ${node.id} via proxy: ${proxyUrl}`);
        nodes.update({
          id: node.id,
          shape: 'image',
          image: proxyUrl,
          size: 40,
          brokenImage: fallbackImage,
          shapeProperties: {
            useBorderWithImage: true,
            useImageSize: false,
          },
        });
      } else {
        console.warn(`⚠️ Loaded image has invalid dimensions for ${node.id}`);
        fallbackToBoxShape(nodes, node);
      }
    };
    img.onerror = () => {
      console.error(`❌ Failed to load image for ${node.id} via proxy`);
      fallbackToBoxShape(nodes, node);
    };
    img.src = proxyUrl;
  });

  if (networkRef.current) {
    networkRef.current.redraw();
  }
}

function fallbackToBoxShape(nodes, node) {
  const content = node.slideData?.content || node.label || '[No content]';
  const truncatedContent = content.length > 50 ? content.substring(0, 50) + '...' : content;

  nodes.update({
    id: node.id,
    shape: 'box',
    image: undefined,
    label: `[+] Double click to expand\n${truncatedContent}`,
    color: {
      background: '#F3F4F6',
      border: '#D1D5DB',
      highlight: {
        background: '#E5E7EB',
        border: '#9CA3AF',
      },
    },
    font: {
      color: '#1F2937',
      size: 14,
      multi: true,
    },
    size: undefined,
    shapeProperties: undefined,
  });
}

export function setupSlidePersistence(networkRef, storyPoints, setStoryPoints, setSelectedNodes) {
  if (!networkRef?.current) return;

  networkRef.current.on('beforeDeleteObject', function (data) {
    const nodes = data.nodes || [];

    nodes.forEach(nodeId => {
      const node = networkRef.current.body.data.nodes.get(nodeId);

      if (node && node.group === 'slide' && node.parentId) {
        setStoryPoints(prevStoryPoints => {
          const updatedStoryPoints = JSON.parse(JSON.stringify(prevStoryPoints));

          const parentIndex = updatedStoryPoints.findIndex(sp => sp.id === node.parentId);
          if (parentIndex !== -1 && updatedStoryPoints[parentIndex].slides) {
            const slideId = node.originalSlideId || node.slideData?.id;

            if (slideId) {
              updatedStoryPoints[parentIndex].slides = updatedStoryPoints[
                parentIndex
              ].slides.filter(slide => slide.id !== slideId);

              localStorage.setItem('storyPoints', JSON.stringify(updatedStoryPoints));

              window.dispatchEvent(
                new CustomEvent('slides-updated', {
                  detail: { updatedStoryPoints },
                })
              );
            }
          }

          return updatedStoryPoints;
        });

        setSelectedNodes(prev => {
          const newSet = new Set(prev);
          if (newSet.has(nodeId)) {
            newSet.delete(nodeId);
            localStorage.setItem('selectedSlides', JSON.stringify(Array.from(newSet)));
          }
          return newSet;
        });
      }
    });
  });

  window.addEventListener('slides-updated', event => {
    if (event.detail?.updatedStoryPoints) {
      syncNetworkWithState(networkRef, event.detail.updatedStoryPoints);
    }
  });

  const syncInterval = setInterval(() => {
    const currentStoryPoints = JSON.parse(localStorage.getItem('storyPoints'));
    if (currentStoryPoints && currentStoryPoints.length > 0) {
      syncNetworkWithState(networkRef, currentStoryPoints);
    }
  }, 30000);

  return function cleanup() {
    clearInterval(syncInterval);
  };
}
