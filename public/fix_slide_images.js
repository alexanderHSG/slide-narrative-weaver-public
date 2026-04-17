(function () {
  console.log('🛠️ Starting slide image fix (proxy mode)...');

  try {
    localStorage.setItem('showImages', 'true');
    console.log('✅ Set localStorage.showImages = true');
  } catch {}

  const networkDiv = document.querySelector('.vis-network');
  if (!networkDiv) return console.error('❌ Network element not found');

  const network = networkDiv.__vis_network__;
  if (!network) return console.error('❌ Network instance not found');

  const FN_PATH = '/.netlify/functions/slide';

  function buildSlideUrl(objectId) {
    if (!objectId) return null;
    return `${FN_PATH}?objectId=${encodeURIComponent(objectId)}`;
  }

  function sanitizeId(v) {
    if (typeof v !== 'string') return null;
    const trimmed = v.trim();
    if (/^[A-Za-z0-9._-]+$/.test(trimmed)) return trimmed;

    if (/^SP_\d+_\d+_slide_\d+$/.test(trimmed)) {
      const parts = trimmed.split('_');
      if (parts[1]) return parts[1];
    }

    const m = trimmed.match(/([A-Za-z0-9._-]{6,})/g);
    if (m && m.length) return m[0];

    return null;
  }

  network.setOptions({
    groups: {
      slide: {
        shape: 'image',
        image:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        size: 45,
      },
    },
  });
  console.log('✅ Added fallback image for slide group');

  const nodes = network.body?.data?.nodes;
  if (!nodes) return console.error('❌ Nodes collection not found');

  const allNodes = nodes.get();
  let fixedCount = 0;

  allNodes.forEach((node) => {
    if (node.group !== 'slide') return;
    const rawId =
      (node.slideData && node.slideData.object_id) || node.object_id || node.id;

    const objectId = sanitizeId(rawId);
    if (!objectId) {
      console.warn('⚠️ Cannot derive object_id for node:', node.id);
      return;
    }

    const url = buildSlideUrl(objectId);
    nodes.update({
      id: node.id,
      shape: 'image',
      image: url,
      size: 45,
      font: { size: 0 },
      label: '',
    });
    fixedCount++;
  });

  network.redraw();
  console.log(`🎉 Fixed ${fixedCount} slide nodes to display via proxy`);

  if (fixedCount === 0) {
    console.warn('⚠️ No slide nodes updated. Check node.group === "slide" and IDs.');
  }
})();