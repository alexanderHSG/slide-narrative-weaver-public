import { useEffect } from 'react';
import { createCanvasFromNodeText } from './createCanvasFromNodeText';
import { uploadCanvasToCloud } from './uploadCanvasToCloud';

type Props = {
  showImages: boolean;
  sharedNetworkRef: React.RefObject<any>;
};

export const useEnforceImageState = ({ showImages, sharedNetworkRef }: Props) => {
  useEffect(() => {
    const monitorAndEnforceStatus = async () => {
      const currentStorageValue = localStorage.getItem('showImages');
      const isShowingImages = currentStorageValue ? JSON.parse(currentStorageValue) : false;

      if (!sharedNetworkRef?.current || !isShowingImages) return;

      const nodes = sharedNetworkRef.current.body.data.nodes;
      const allNodes = nodes.get();

      const nodesToUpdate = allNodes.filter(
        (node: any) => node.group === 'slide' && node.shape !== 'image'
      );

      if (nodesToUpdate.length === 0) return;

      for (const node of nodesToUpdate) {
        try {
          const canvas = createCanvasFromNodeText(node.slideData?.content || node.label);
          const imageUrl = await uploadCanvasToCloud(canvas, node.id);
          if (!imageUrl) continue;

          nodes.update({
            id: node.id,
            image: imageUrl,
            shape: 'image',
            size: 40,
            widthConstraint: 150,
            heightConstraint: 100,
            shapeProperties: {
              useBorderWithImage: true,
              useImageSize: false,
            },
          });
        } catch (error) {
          console.error(`❌ Failed to update node ${node.id}:`, error);
        }
      }

      sharedNetworkRef.current.redraw();
    };

    monitorAndEnforceStatus();
    const intervalId = setInterval(monitorAndEnforceStatus, 5000);
    return () => clearInterval(intervalId);
  }, [showImages, sharedNetworkRef]);
};
