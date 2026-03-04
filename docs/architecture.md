# Architecture

This project is composed of a **React/Vite frontend** and **Netlify Functions** backend.

```
browser
  └─ React App (Vite) ────────────────────────────────────────────────┐
      • vis-network graph                                            │
      • PDF/PPTX export                                              │
      • Calls Netlify Functions via fetch                            │
                                                                     ▼
Netlify Functions                                                    ┌──────────────────────┐
  • Neo4j queries (search, decks, slides, save)  ───────────────────►│ Neo4j                │
  • Auth/session helpers (experimental login)                        └──────────────────────┘
  • Image proxy (hard overlay watermark for experimental users, implemented inline in `netlify/functions/slide.js`)      ┌──────────────────────┐
  • Utilities (base64 image, merge)               ───────────────────►│ S3 (slide images)    │
                                                                     └──────────────────────┘
                                                                     ┌──────────────────────┐
                                                 ───────────────────►│ Supabase (merge func,│
                                                                     │ optional user logs)  │
                                                                     └──────────────────────┘
```

### Data Flow

1. **User signs in to experimental session** via:
   - `/.netlify/functions/qualtrics-exp-login` → returns `login_url`
   - Browser opens `/.netlify/functions/experimental-login?token=...` → sets `exp_session` cookie.

2. **Frontend renders graph** (vis-network). When it needs slide thumbnails, it **must** call:
   - `/.netlify/functions/slide?objectId=<id>`
   - Function fetches original from S3 and, if experimental user cookie is present & valid, **composites a tiled SVG watermark** via `sharp` before returning the image (with `Cache-Control: no-store`).

3. **Search & similarity** use Neo4j:
   - `embeddings` (OpenAI) → `fetchSimilarSlides` (Neo4j cosine).

4. **Export**:
   - **PDF** embeds whatever image URLs you pass (use the proxy URL so experimental users get watermarked images).
   - **PPTX** uses a Supabase function that merges original deck slides. (Watermarking is not applied here unless you add a dedicated deck/slide rasterization step.)

### Notable Directories

- `src/` – components, hooks, utils (graph, export, images).
- `netlify/functions/` – serverless functions (see API reference).
- `netlify/_shared/` – shared helpers (Neo4j session wrapper, etc.).