import { useEffect, useCallback } from 'react';
import { syncNetworkWithState, setupSlidePersistence } from '@/weaver/toolkit/utils/syncUtils';

function sanitizeId(v: string) {
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

function buildSlideUrl(objectId: string | number | boolean) {
  return objectId ? `/.netlify/functions/slide?objectId=${encodeURIComponent(objectId)}` : null;
}

type NetworkRefType = {
  current: any; 
};

interface UseNetworkManagerProps {
  networkRef: NetworkRefType;
  storyPoints: any[];
  setStoryPoints: (points: any[]) => void;
  setSelectedNodes: (nodes: any[]) => void;
  setLockedNodes: (nodes: any[]) => void;
}

export function useNetworkManager({
  networkRef,
  storyPoints,
  setStoryPoints,
  setSelectedNodes,
  setLockedNodes,
}: UseNetworkManagerProps) {
  useEffect(() => {
    if (!networkRef?.current || !storyPoints) return;

    syncNetworkWithState(networkRef.current, storyPoints);

    const cleanup = setupSlidePersistence(
      networkRef,
      storyPoints,
      setStoryPoints,
      setSelectedNodes
    );

    return () => {
      if (cleanup) cleanup();
    };
  }, [networkRef, storyPoints, setStoryPoints, setSelectedNodes]);

  const ensureSlideVisibility = useCallback(() => {
    if (!networkRef?.current || !storyPoints || storyPoints.length === 0) return;

    const nodes = networkRef.current.body.data.nodes;
    const edges = networkRef.current.body.data.edges;
    const allNodes = nodes.get();

    storyPoints.forEach((storyPoint: { slides: any[]; id: any; }) => {
      if (!storyPoint.slides || storyPoint.slides.length === 0) return;

      const visibleSlides = storyPoint.slides.filter((slide: { visible: boolean; }) => slide.visible !== false);
      if (visibleSlides.length === 0) return;

      const storyPointNode = allNodes.find((node: { id: any; }) => node.id === storyPoint.id);
      if (!storyPointNode) return;

      const existingSlideNodes = allNodes.filter(
        (        node: { parentId: any; group: string; }) => node.parentId === storyPoint.id && node.group === 'slide'
      );

      if (existingSlideNodes.length === 0) {
        visibleSlides.forEach((slide: { id: any; object_id: any; content: any; percentage: any; similarity: any; }, i: number) => {
          const slideId = slide.id;
          const rawObjectId = slide.object_id || slide.id;
          if (!objectId) return;

          const uniqueSlideId = `${storyPoint.id}_${slideId}_restored`;

          try {
            nodes.add({
              id: uniqueSlideId,
              label: `Slide ${i + 1}\n[+] Double click to expand`,
              group: 'slide',
              parentId: storyPoint.id,
              originalSlideId: slideId,
              slideData: {
                type: `Slide ${i + 1}`,
                content: slide.content || '',
                expanded: false,
                object_id: objectId,
              },
              shape: 'image',
              image: buildSlideUrl(objectId),
              size: 45,
              brokenImage:
                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
              font: {
                color: '#1F2937',
                size: 12,
                face: 'Arial',
                background: 'rgba(255, 255, 255, 0.7)',
                strokeWidth: 2,
                strokeColor: '#ffffff',
                vadjust: 3,
              },
              shapeProperties: {
                useBorderWithImage: true,
                useImageSize: false,
              },
              locked: false,
            });

            edges.add({
              id: `edge_${uniqueSlideId}_${storyPoint.id}`,
              from: uniqueSlideId,
              to: storyPoint.id,
              label: `${slide.percentage || Math.round((slide.similarity || 0) * 100)}%`,
              arrows: 'to',
              color: { color: '#000000' },
              smooth: {
                type: 'curvedCW',
                roundness: 0.2,
              },
            });
          } catch (error) {
            console.error(`Error restoring slide node:`, error);
          }
        });

        networkRef.current.redraw();
      }
    });
  }, [networkRef, storyPoints]);

  const restoreNetworkFromState = useCallback(() => {
    if (!networkRef?.current || storyPoints.length === 0) return;

    const nodes = networkRef.current.body.data.nodes;

    if (nodes.get().length === 0 && storyPoints.length > 0) {
      storyPoints.forEach((sp: { id: any; description: string; slides: any[]; }, index: number) => {
        nodes.add({
          id: sp.id,
          label: `SP${index + 1}\n${sp.description.substring(0, 60)}`,
          group: 'storypoint',
          description: sp.description,
          color: {
            background: '#2E7D32',
            border: '#1B5E20',
            highlight: {
              background: '#1B5E20',
              border: '#4CAF50',
            },
          },
          font: {
            face: 'Inter, system-ui, sans-serif',
            bold: true,
            size: 14,
            color: 'white',
            align: 'center',
            multi: true,
          },
          size: 50,
        });

        if (sp.slides) {
          const visibleSlides = sp.slides.filter((slide: { visible: boolean; }) => slide.visible !== false);
          visibleSlides.forEach(() => {
            try {
              ensureSlideVisibility();
            } catch (error) {
              console.error('Error restoring slides:', error);
            }
          });
        }
      });

      storyPoints.forEach((sp: { id: any; }, index: number) => {
        if (index > 0) {
          networkRef.current.body.data.edges.add({
            id: `edge_${storyPoints[index - 1].id}_${sp.id}`,
            from: storyPoints[index - 1].id,
            to: sp.id,
            label: `Next`,
            arrows: 'to',
            color: { color: '#2E7D32' },
            width: 3,
            smooth: {
              type: 'curvedCW',
              roundness: 0.2,
            },
          });
        }
      });

      networkRef.current.setOptions({
        layout: {
          hierarchical: {
            enabled: true,
            direction: 'LR',
            sortMethod: 'directed',
            levelSeparation: 250,
            nodeSpacing: 200,
            treeSpacing: 200,
          },
        },
        physics: {
          enabled: true,
          stabilization: {
            enabled: true,
            iterations: 100,
          },
        },
      });

      setTimeout(() => {
        networkRef.current.fit();
        setTimeout(() => {
          networkRef.current.setOptions({
            physics: { enabled: false },
          });
        }, 1000);
      }, 200);
    }
  }, [storyPoints, networkRef, ensureSlideVisibility]);

  const handleLockNodesChange = useCallback(
    (newLockedNodes: any) => {
      setLockedNodes(newLockedNodes);
      localStorage.setItem('lockedNodes', JSON.stringify(Array.from(newLockedNodes)));
    },
    [setLockedNodes]
  );

  return {
    ensureSlideVisibility,
    restoreNetworkFromState,
    handleLockNodesChange,
  };
}
