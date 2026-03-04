# Frontend Overview

The UI is a Vite/React app that renders a **graph** of Story Points (SP) and Slide nodes using **vis-network**.

## Key Areas

- `src/components/GraphVisualization/GraphVisualization.jsx` – main canvas.
- Hooks under `src/hooks/`:
  - `useGraphLogic/*` – graph state, selection, loading of slides.
  - `useNetworkManager.ts` – reconciles state with the vis-network instance; restores slides; ensures visibility.
- Utilities under `src/utils/`:
  - `utils/graph/populateGraphDatasets.ts` – computes node/edge data (+ positions) and injects them into vis.
  - `utils/syncUtils.js` – syncing and persistence; slide image loading fallback logic.

## Export

- **PDF** (`src/lib/export/handleExport.ts`): uses `jsPDF`. It calls `callGetImageBase64(url)` – pass the **proxy** URL so the embedded image matches the server-side watermarking rules.
- **PPTX** (`handleExport.ts`): fetches `{ deck_id, slide_number }` via `getSlideDeckInfo` and calls a Supabase function to merge. This uses **original deck PPTX files** (no watermark).

## vis-network conventions

- Story Points are group `storypoint` nodes.
- Slides are group `slide` nodes with `slideData` containing `{ object_id, content, ... }`.
- Edges from slides to SPs use IDs like `edge_${slideKey}_${sp.id}`.


## Image loading rules

- Always build slide image URLs via the **proxy**: `/.netlify/functions/slide?objectId=<id>`.
- Do **not** link S3 directly — watermarks apply only through the proxy.
- The canonical `objectId` includes the `_slide_<n>` suffix (e.g., `ba8091ec60e671fb9a864bcda5b59acf_slide_21`).
  Functions may reject or fail on incomplete IDs.