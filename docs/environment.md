# Environment & Configuration

The project uses both **frontend (Vite)** and **Netlify Functions** environment variables.

## Frontend (`import.meta.env.*`)

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (used for PPTX merge endpoint and other utilities). |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key for client calls. |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | (If used) Cloudinary preset for uploads. |
| `NETLIFY_NEO4J_URI` / `NETLIFY_NEO4J_USERNAME` | Occasionally referenced in the UI; backend uses `NEO4J_*`. |

> Frontend vars must start with `VITE_` to be exposed to the client by Vite.

## Netlify Functions (`process.env.*`)

| Variable | Required | Purpose |
|---|---|---|
| `FRONTEND_URL` or `VITE_SITE_URL` | ✅ | Used for redirects, CORS and cookies. |
| `JWT_SIGNING_KEY` | ✅ | HMAC secret for experimental session JWT (aud: `inspira.auth`); **also used by `slide` to verify `exp_session`.** |
| `ENABLE_DEV_ISSUE` | optional | Allows dev flow `experimental-login?pid=...` when not in production context. |
| `S3_BASE` | ✅ | Base URL for slide images (e.g., `https://slidestorage.s3.eu-north-1.amazonaws.com`). |
| `S3_EXTS` | optional | Comma-separated extensions to try (default `png`). Recommended: `png,jpg,jpeg,webp`. |
| `OPENAI_API_KEY` | if embeddings/LLM used | OpenAI SDK in `embeddings.js`, `regenerateStoryPoint.js`, etc. |
| `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` | ✅ | Neo4j connection, used by `withNeo4j`. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` or `SERVICE_ROLE_KEY` | optional | For server-side upserts (e.g., marking users experimental). |
| `SUPABASE_JWT_SECRET` | optional | Some helpers validate Supabase session tokens. |
| `QUALTRICS_SHARED_SECRET` | optional | Required by `qualtrics-exp-login`. |
| `CONTEXT`, `NETLIFY_DEV` | auto | Netlify build/runtime flags. |
| `CLOUDINARY_CLOUD_NAME` | optional | Only if you use Cloudinary in your flows. |

### Netlify configuration

Recommended `netlify.toml`:

```toml
[build]
command = "npm run build"
publish = "dist"

[functions]
node_bundler = "esbuild"
included_files = ["netlify/_shared/**"]
```