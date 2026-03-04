# InspiraGraph

End-to-end system for building, exploring and exporting slide “stories” from decks.
Frontend renders an interactive graph (story points + slide thumbnails).
Backend uses Netlify Functions (Neo4j for graph data, S3 for slide assets, Supabase for utilities).
**Experimental sessions** get a **per-user watermark** composited server-side on every slide image.

> This repository includes a React frontend (Vite) in `src/` and serverless functions in `netlify/functions/`.

## Documentation

- **Architecture** – high-level diagram & data flow  
  → [docs/architecture.md](docs/architecture.md)

- **Environment & Config** – required env vars (frontend + functions)  
  → [docs/environment.md](docs/environment.md)

- **API Reference** – Netlify functions & endpoints used by the app  
  → [docs/api-reference.md](docs/api-reference.md)

- **Frontend Overview** – graph rendering, hooks, image proxy integration points  
  → [docs/frontend.md](docs/frontend.md)

- **Watermarking (experimental)** – per-user overlay details & decisions  
  → [docs/watermarking.md](docs/watermarking.md)

- **Troubleshooting** – common pitfalls (sharp, CORS, latency, TS formatting)  
  → [docs/troubleshooting.md](docs/troubleshooting.md)

## Quickstart

```bash
# install root deps
npm i

# install per-functions deps (sharp/jose live under netlify/functions)
npm i --prefix netlify/functions sharp jose

# development
netlify dev
```

- If you use `netlify dev`, it proxies `/.netlify/functions/*` to your functions.
- Make sure `FRONTEND_URL` (or `VITE_SITE_URL`) matches the origin you open in the browser (`http://localhost:8888` by default).

## Build & Deploy (Netlify)

- Set required environment variables (see **docs/environment.md**).
- Ensure *Functions bundling* installs `netlify/functions/package.json` (Netlify does this automatically).

Minimal `netlify.toml`:

```toml
[build]
command = "npm run build"
publish = "dist"

[functions]
node_bundler = "esbuild"
included_files = ["netlify/_shared/**"]
```

If you hit `Could not resolve "sharp"` during bundling, run:

```bash
npm i --prefix netlify/functions sharp jose
```

Then clear Netlify build cache and redeploy.

## Status: watermarking “hard overlay”

- Experimental users (those logged in via `experimental-login`/`qualtrics-exp-login`) receive **server-side composited watermarks** on each slide image via `/.netlify/functions/slide?objectId=...`.
- Replace **all direct S3 references** with calls to this function to ensure consistent behaviour and headers.

See **docs/watermarking.md** for details.