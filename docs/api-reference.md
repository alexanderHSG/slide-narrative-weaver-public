# API / Functions Reference

**Total endpoints:** 42  |  **Shared helpers:** 4  |  **Function helpers:** 7

## Table of contents
- [Admin & Maintenance](#admin--maintenance) (9)
- [Auth & Session](#auth--session) (8)
- [Decks & Slides](#decks--slides) (3)
- [Images & Watermark](#images--watermark) (2)
- [Misc](#misc) (6)
- [Search, AI & Evaluation](#search,-ai--evaluation) (5)
- [Story Points & Authoring](#story-points--authoring) (4)
- [User & Analytics](#user--analytics) (3)
- [Utilities & Health](#utilities--health) (2)
- [Shared & Helper Modules](#shared--helper-modules)

## Admin & Maintenance

| Function | Methods | Endpoint | Content-Type |
|---|---|---|---|
| `admin-delete-allowed` | OPTIONS | `/.netlify/functions/admin-delete-allowed` | application/json |
| `admin-delete-users` | OPTIONS | `/.netlify/functions/admin-delete-users` | application/json |
| `admin-issue-exp-token` | OPTIONS | `/.netlify/functions/admin-issue-exp-token` | application/json |
| `admin-list-allowed` | OPTIONS | `/.netlify/functions/admin-list-allowed` | application/json |
| `admin-list-users` | OPTIONS | `/.netlify/functions/admin-list-users` | application/json |
| `admin-upsert-allowed` | OPTIONS | `/.netlify/functions/admin-upsert-allowed` | application/json |
| `admin-upsert-users` | OPTIONS | `/.netlify/functions/admin-upsert-users` | application/json |
| `command` | GET | `/.netlify/functions/command` | application/json |
| `setupNeo4jSchema` | GET | `/.netlify/functions/setupNeo4jSchema` | application/json |

<details>
<summary><strong>admin-delete-allowed</strong> — Delete allowed suffix/domain (admin).</summary>

**Endpoint:** `/.netlify/functions/admin-delete-allowed`  
**Methods:** OPTIONS  
**Content-Type:** application/json
**Query params:** —
**Body keys:** `email_suffix`
**Env:** `FRONTEND_URL`
**Notes:** Requires valid Supabase session; Supabase access; Admin-only

**Example request**
```bash
curl 'https://<site>/.netlify/functions/admin-delete-allowed'
```

**Sample response**
```json
{
  "ok": true
}
```

</details>

<details>
<summary><strong>admin-delete-users</strong> — Delete a user (admin).</summary>

**Endpoint:** `/.netlify/functions/admin-delete-users`  
**Methods:** OPTIONS  
**Content-Type:** application/json
**Query params:** —
**Body keys:** `alsoDeleteAuth`, `user_id`
**Env:** `FRONTEND_URL`
**Notes:** Requires valid Supabase session; Supabase access; Admin-only

**Example request**
```bash
curl 'https://<site>/.netlify/functions/admin-delete-users'
```

**Sample response**
```json
{
  "ok": true
}
```

</details>

<details>
<summary><strong>admin-issue-exp-token</strong> — Mint an experimental JWT for pid/prototype (admin).</summary>

**Endpoint:** `/.netlify/functions/admin-issue-exp-token`  
**Methods:** OPTIONS  
**Content-Type:** application/json
**Query params:** —
**Body keys:** `next`, `pid`, `prototype`, `ttl`
**Env:** `FRONTEND_URL`, `JWT_SIGNING_KEY`, `VITE_SITE_URL`
**Imports:** `jsonwebtoken`
**Notes:** Requires valid Supabase session; Supabase access; Admin-only

**Example request**
```bash
curl 'https://<site>/.netlify/functions/admin-issue-exp-token'
```

**Sample response**
```json
{
  "token": "<jwt>",
  "pid": "...",
  "prototype": "C1",
  "login_url": "https://<site>/.netlify/functions/experimental-login?token=..."
}
```

</details>

<details>
<summary><strong>admin-list-allowed</strong> — List allowed email suffixes/domains (admin).</summary>

**Endpoint:** `/.netlify/functions/admin-list-allowed`  
**Methods:** OPTIONS  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Env:** `FRONTEND_URL`
**Notes:** Requires valid Supabase session; Supabase access; Admin-only

**Example request**
```bash
curl 'https://<site>/.netlify/functions/admin-list-allowed'
```

**Sample response**
```json
{
  "allowed": [
    {
      "suffix": "@org.com"
    }
  ]
}
```

</details>

<details>
<summary><strong>admin-list-users</strong> — List users (admin).</summary>

**Endpoint:** `/.netlify/functions/admin-list-users`  
**Methods:** OPTIONS  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Env:** `FRONTEND_URL`
**Notes:** Requires valid Supabase session; Supabase access; Admin-only

**Example request**
```bash
curl 'https://<site>/.netlify/functions/admin-list-users'
```

**Sample response**
```json
{
  "users": [
    {
      "id": "...",
      "email": "..."
    }
  ]
}
```

</details>

<details>
<summary><strong>admin-upsert-allowed</strong> — Insert/update allowed suffixes/domains (admin).</summary>

**Endpoint:** `/.netlify/functions/admin-upsert-allowed`  
**Methods:** OPTIONS  
**Content-Type:** application/json
**Query params:** —
**Body keys:** `email_suffix`
**Env:** `FRONTEND_URL`
**Notes:** Requires valid Supabase session; Supabase access; Admin-only

**Example request**
```bash
curl 'https://<site>/.netlify/functions/admin-upsert-allowed'
```

**Sample response**
```json
{
  "ok": true
}
```

</details>

<details>
<summary><strong>admin-upsert-users</strong> — Create/update a user (admin).</summary>

**Endpoint:** `/.netlify/functions/admin-upsert-users`  
**Methods:** OPTIONS  
**Content-Type:** application/json
**Query params:** —
**Body keys:** `email`, `preferred_db`, `role`, `send_invite`, `user_id`, `user_type`
**Env:** `FRONTEND_URL`
**Notes:** Requires valid Supabase session; Supabase access; Admin-only

**Example request**
```bash
curl 'https://<site>/.netlify/functions/admin-upsert-users'
```

**Sample response**
```json
{
  "ok": true
}
```

</details>

<details>
<summary><strong>command</strong> — Dev/admin command runner (restricted).</summary>

**Endpoint:** `/.netlify/functions/command`  
**Methods:** GET  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Env:** `DATABASE_URL`
**Imports:** `pg`
**Notes:** Requires valid Supabase session; Supabase access

**Example request**
```bash
curl 'https://<site>/.netlify/functions/command'
```

**Sample response**
```json
{
  "ok": true
}
```

</details>

<details>
<summary><strong>setupNeo4jSchema</strong> — Create indexes/constraints in Neo4j.</summary>

**Endpoint:** `/.netlify/functions/setupNeo4jSchema`  
**Methods:** GET  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Notes:** Uses `withNeo4j` wrapper (Neo4j session); Neo4j access

**Example request**
```bash
curl 'https://<site>/.netlify/functions/setupNeo4jSchema'
```

**Sample response**
```json
{
  "ok": true
}
```

</details>

---

## Auth & Session

| Function | Methods | Endpoint | Content-Type |
|---|---|---|---|
| `auth` | OPTIONS/POST | `/.netlify/functions/auth` | application/json |
| `experimental-login` | GET | `/.netlify/functions/experimental-login` | application/json |
| `get-profile` | OPTIONS | `/.netlify/functions/get-profile` | application/json |
| `logout` | OPTIONS | `/.netlify/functions/logout` | application/json |
| `qualtrics-exp-login` | GET/OPTIONS | `/.netlify/functions/qualtrics-exp-login` | application/json |
| `send-magic-link` | OPTIONS | `/.netlify/functions/send-magic-link` | application/json |
| `verify-session` | OPTIONS | `/.netlify/functions/verify-session` | application/json |
| `whoami` | OPTIONS | `/.netlify/functions/whoami` | application/json |

<details>
<summary><strong>auth</strong> — Return current auth/session context.</summary>

**Endpoint:** `/.netlify/functions/auth`  
**Methods:** OPTIONS/POST  
**Content-Type:** application/json
**Query params:** —
**Body keys:** `email`, `password`
**Env:** `FRONTEND_URL`, `NODE_ENV`, `SERVICE_ROLE_KEY`, `SUPABASE_URL`
**Imports:** `@supabase/supabase-js`, `cookie`
**Notes:** Supabase access

**Example request**
```bash
curl -X POST 'https://<site>/.netlify/functions/auth' \
  -H 'Content-Type: application/json' \
  -d '{
  "email": "<email>",
  "password": "<password>"
}'
```

**Sample response**
```json
{
  "authenticated": true,
  "user": {
    "id": "...",
    "email": "..."
  }
}
```

</details>

<details>
<summary><strong>experimental-login</strong> — Validate or mint JWT and set `exp_session` cookie (dev-mode allowed).</summary>

**Endpoint:** `/.netlify/functions/experimental-login`  
**Methods:** GET  
**Content-Type:** application/json
**Query params:** `next`, `pid`, `prototype`, `token`
**Body keys:** —
**Env:** `CONTEXT`, `ENABLE_DEV_ISSUE`, `FRONTEND_URL`, `JWT_SIGNING_KEY`, `NETLIFY_DEV`, `SERVICE_ROLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `VITE_SITE_URL`, `VITE_SUPABASE_URL`
**Imports:** `@supabase/supabase-js`, `jose`, `jsonwebtoken`
**Notes:** Sets/reads `exp_session` cookie; Sends `Cache-Control: no-store`; Supabase access

**Example request**
```bash
curl 'https://<site>/.netlify/functions/experimental-login?next=<next>&pid=<pid>&prototype=<prototype>&token=<token>'
```

**Sample response**
```json
{
  "status": 302,
  "set_cookie": "exp_session=...",
  "location": "/app"
}
```

</details>

<details>
<summary><strong>get-profile</strong> — Return user's profile record (Supabase).</summary>

**Endpoint:** `/.netlify/functions/get-profile`  
**Methods:** OPTIONS  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Env:** `FRONTEND_URL`
**Notes:** Requires valid Supabase session; Requires `Authorization: Bearer <token>`; Supabase access

**Example request**
```bash
curl 'https://<site>/.netlify/functions/get-profile' \
  -H 'Authorization: Bearer <token>'
```

**Sample response**
```json
{
  "ok": true
}
```

</details>

<details>
<summary><strong>logout</strong> — Clear session cookies / logout user.</summary>

**Endpoint:** `/.netlify/functions/logout`  
**Methods:** OPTIONS  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Env:** `FRONTEND_URL`
**Imports:** `cookie`

**Example request**
```bash
curl 'https://<site>/.netlify/functions/logout'
```

**Sample response**
```json
{
  "ok": true
}
```

</details>

<details>
<summary><strong>qualtrics-exp-login</strong> — Qualtrics-authenticated mint of experimental JWT; returns login URL to `experimental-login`.</summary>

**Endpoint:** `/.netlify/functions/qualtrics-exp-login`  
**Methods:** GET/OPTIONS  
**Content-Type:** application/json
**Query params:** `next`, `pid`, `prototype`, `ttl`
**Body keys:** `next`, `pid`, `prototype`, `ttl`
**Env:** `FRONTEND_URL`, `JWT_SIGNING_KEY`, `QUALTRICS_SHARED_SECRET`, `VITE_SITE_URL`
**Imports:** `jsonwebtoken`, `node:crypto`
**Notes:** Requires `Authorization: Bearer <token>`

**Example request**
```bash
curl 'https://<site>/.netlify/functions/qualtrics-exp-login?next=<next>&pid=<pid>&prototype=<prototype>&ttl=<ttl>' \
  -H 'Authorization: Bearer <token>'
```

**Sample response**
```json
{
  "ok": true,
  "pid": "q-abc123",
  "prototype": "I1",
  "expires_in": 10800,
  "token": "<jwt>",
  "login_url": "https://<site>/.netlify/functions/experimental-login?token=...",
  "https": true
}
```

</details>

<details>
<summary><strong>send-magic-link</strong> — Send a Supabase magic link email.</summary>

**Endpoint:** `/.netlify/functions/send-magic-link`  
**Methods:** OPTIONS  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Env:** `FRONTEND_URL`, `SERVICE_ROLE_KEY`, `SUPABASE_URL`
**Imports:** `@supabase/supabase-js`
**Notes:** Supabase access

**Example request**
```bash
curl 'https://<site>/.netlify/functions/send-magic-link'
```

**Sample response**
```json
{
  "ok": true
}
```

</details>

<details>
<summary><strong>verify-session</strong> — Verify Supabase session/JWT; return status.</summary>

**Endpoint:** `/.netlify/functions/verify-session`  
**Methods:** OPTIONS  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Env:** `FRONTEND_URL`, `SERVICE_ROLE_KEY`, `SUPABASE_URL`
**Imports:** `@supabase/supabase-js`, `cookie`
**Notes:** Supabase access

**Example request**
```bash
curl 'https://<site>/.netlify/functions/verify-session'
```

**Sample response**
```json
{
  "authenticated": true,
  "provider": "supabase"
}
```

</details>

<details>
<summary><strong>whoami</strong> — Return identity claims for current user.</summary>

**Endpoint:** `/.netlify/functions/whoami`  
**Methods:** OPTIONS  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Env:** `FRONTEND_URL`, `JWT_SIGNING_KEY`
**Imports:** `jose`

**Example request**
```bash
curl 'https://<site>/.netlify/functions/whoami'
```

**Sample response**
```json
{
  "pid": "...",
  "proto": "I2",
  "roles": [
    "experimental"
  ]
}
```

</details>

---

## Decks & Slides

| Function | Methods | Endpoint | Content-Type |
|---|---|---|---|
| `c1-deck-slides` | GET | `/.netlify/functions/c1-deck-slides` | application/json |
| `c1-decks` | GET | `/.netlify/functions/c1-decks` | application/json |
| `getSlideDeckInfo` | GET | `/.netlify/functions/getSlideDeckInfo` | application/json |

<details>
<summary><strong>c1-deck-slides</strong> — Return slides for a deck (id), including `object_id` and slide numbers.</summary>

**Endpoint:** `/.netlify/functions/c1-deck-slides`  
**Methods:** GET  
**Content-Type:** application/json
**Query params:** `id`, `limit`
**Body keys:** —
**Notes:** Uses `withNeo4j` wrapper (Neo4j session); Neo4j access

**Example request**
```bash
curl 'https://<site>/.netlify/functions/c1-deck-slides?id=<id>&limit=<limit>'
```

**Sample response**
```json
{
  "deck_id": "<deck>",
  "deck_title": "<title>",
  "slides": [
    {
      "id": "...",
      "title": "...",
      "object_id": "...",
      "slide_number": 1,
      "content": "..."
    }
  ]
}
```

</details>

<details>
<summary><strong>c1-decks</strong> — Return deck listing grouped by category with counts.</summary>

**Endpoint:** `/.netlify/functions/c1-decks`  
**Methods:** GET  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Notes:** Uses `withNeo4j` wrapper (Neo4j session); Neo4j access

**Example request**
```bash
curl 'https://<site>/.netlify/functions/c1-decks'
```

**Sample response**
```json
{
  "decks": [
    {
      "deck_id": "...",
      "title": "...",
      "category": "...",
      "slide_count": 42
    }
  ]
}
```

</details>

<details>
<summary><strong>getSlideDeckInfo</strong> — Map slide `object_id` → { deck_id, slide_number } (PPTX merge).</summary>

**Endpoint:** `/.netlify/functions/getSlideDeckInfo`  
**Methods:** GET  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Env:** `FRONTEND_URL`
**Notes:** Uses `withNeo4j` wrapper (Neo4j session); Neo4j access

**Example request**
```bash
curl 'https://<site>/.netlify/functions/getSlideDeckInfo'
```

**Sample response**
```json
[
  {
    "object_id": "...",
    "deck_id": "...",
    "slide_number": 7
  }
]
```

</details>

---

## Images & Watermark

| Function | Methods | Endpoint | Content-Type |
|---|---|---|---|
| `getImageBase64` | GET | `/.netlify/functions/getImageBase64` | application/json |
| `slide` | GET | `/.netlify/functions/slide` | image/png or image/jpeg |

<details>
<summary><strong>getImageBase64</strong> — Return a Base64 data URL for an image (for PDF embedding).</summary>

**Endpoint:** `/.netlify/functions/getImageBase64`  
**Methods:** GET  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Imports:** `node-fetch`
**Notes:** Requires valid Supabase session; Supabase access

**Example request**
```bash
curl 'https://<site>/.netlify/functions/getImageBase64'
```

**Sample response**
```json
{
  "dataUrl": "data:image/png;base64,...."
}
```

</details>

<details>
<summary><strong>slide</strong> — Proxy slide image (S3) with optional hard watermarking for experimental users.</summary>

**Endpoint:** `/.netlify/functions/slide`  
**Methods:** GET  
**Content-Type:** image/png or image/jpeg
**Query params:** `objectId`
**Body keys:** —
**Env:** `S3_BASE`, `S3_EXTS`, `JWT_SIGNING_KEY`
**Imports:** `sharp`
**Notes:** Verifies `exp_session` (JWT, aud `inspira.auth`) and, when valid, applies a hard watermark (via `sharp`). Sends `Cache-Control: no-store`.

**Example request**
```bash
curl 'https://<site>/.netlify/functions/slide?objectId=<objectId>'
```

**Sample response**
_Binary image (PNG/JPEG). Headers example:_
```http
HTTP/1.1 200 OK
Content-Type: image/png
Cache-Control: no-store
Referrer-Policy: same-origin

<binary>
```

</details>

---

## Misc

| Function | Methods | Endpoint | Content-Type |
|---|---|---|---|
| `addEdge` | GET | `/.netlify/functions/addEdge` | application/json |
| `deleteNode` | GET | `/.netlify/functions/deleteNode` | application/json |
| `deleteSlides` | GET | `/.netlify/functions/deleteSlides` | application/json |
| `findSlideReference` | GET | `/.netlify/functions/findSlideReference` | application/json |
| `findSlidesByKeywords` | GET | `/.netlify/functions/findSlidesByKeywords` | application/json |
| `generateSlides` | OPTIONS | `/.netlify/functions/generateSlides` | application/json |

<details>
<summary><strong>addEdge</strong> — Create a relationship between two Neo4j nodes.</summary>

**Endpoint:** `/.netlify/functions/addEdge`  
**Methods:** GET  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Notes:** Uses `withNeo4j` wrapper (Neo4j session); Neo4j access

**Example request**
```bash
curl 'https://<site>/.netlify/functions/addEdge'
```

**Sample response**
```json
{
  "ok": true
}
```

</details>

<details>
<summary><strong>deleteNode</strong> — Delete a node (and relations) in Neo4j.</summary>

**Endpoint:** `/.netlify/functions/deleteNode`  
**Methods:** GET  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Notes:** Uses `withNeo4j` wrapper (Neo4j session); Neo4j access

**Example request**
```bash
curl 'https://<site>/.netlify/functions/deleteNode'
```

**Sample response**
```json
{
  "ok": true
}
```

</details>

<details>
<summary><strong>deleteSlides</strong> — Delete slide nodes in Neo4j.</summary>

**Endpoint:** `/.netlify/functions/deleteSlides`  
**Methods:** GET  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Notes:** Uses `withNeo4j` wrapper (Neo4j session); Neo4j access

**Example request**
```bash
curl 'https://<site>/.netlify/functions/deleteSlides'
```

**Sample response**
```json
{
  "ok": true
}
```

</details>

<details>
<summary><strong>findSlideReference</strong> — Utility endpoint.</summary>

**Endpoint:** `/.netlify/functions/findSlideReference`  
**Methods:** GET  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Notes:** Uses `withNeo4j` wrapper (Neo4j session); Neo4j access

**Example request**
```bash
curl 'https://<site>/.netlify/functions/findSlideReference'
```

**Sample response**
```json
{
  "ok": true
}
```

</details>

<details>
<summary><strong>findSlidesByKeywords</strong> — Utility endpoint.</summary>

**Endpoint:** `/.netlify/functions/findSlidesByKeywords`  
**Methods:** GET  
**Content-Type:** application/json
**Query params:** —
**Body keys:** `canvasIds`, `limit`, `query`, `refinementPrompt`, `searchType`
**Env:** `FRONTEND_URL`
**Notes:** Uses `withNeo4j` wrapper (Neo4j session); Uses OpenAI API; Neo4j access

**Example request**
```bash
curl 'https://<site>/.netlify/functions/findSlidesByKeywords'
```

**Sample response**
```json
{
  "ok": true
}
```

</details>

<details>
<summary><strong>generateSlides</strong> — Utility endpoint.</summary>

**Endpoint:** `/.netlify/functions/generateSlides`  
**Methods:** OPTIONS  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Env:** `FRONTEND_URL`, `OPENAI_API_KEY`
**Imports:** `openai`
**Notes:** Uses OpenAI API

**Example request**
```bash
curl 'https://<site>/.netlify/functions/generateSlides'
```

**Sample response**
```json
{
  "ok": true
}
```

</details>

---

## Search, AI & Evaluation

| Function | Methods | Endpoint | Content-Type |
|---|---|---|---|
| `embeddings` | OPTIONS | `/.netlify/functions/embeddings` | application/json |
| `enhance` | OPTIONS | `/.netlify/functions/enhance` | application/json |
| `evaluateSlides` | OPTIONS | `/.netlify/functions/evaluateSlides` | application/json |
| `fetchSimilarSlides` | GET | `/.netlify/functions/fetchSimilarSlides` | application/json |
| `shortTitle` | OPTIONS | `/.netlify/functions/shortTitle` | application/json |

<details>
<summary><strong>embeddings</strong> — Generate an embedding vector via OpenAI.</summary>

**Endpoint:** `/.netlify/functions/embeddings`  
**Methods:** OPTIONS  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Env:** `FRONTEND_URL`, `OPENAI_API_KEY`
**Imports:** `openai`
**Notes:** Uses OpenAI API

**Example request**
```bash
curl 'https://<site>/.netlify/functions/embeddings'
```

**Sample response**
```json
{
  "embedding": [
    0.012,
    -0.34,
    0.98
  ]
}
```

</details>

<details>
<summary><strong>enhance</strong> — LLM-based enhancement (titles/text).</summary>

**Endpoint:** `/.netlify/functions/enhance`  
**Methods:** OPTIONS  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Env:** `FRONTEND_URL`, `OPENAI_API_KEY`
**Imports:** `openai`
**Notes:** Uses OpenAI API

**Example request**
```bash
curl 'https://<site>/.netlify/functions/enhance'
```

**Sample response**
```json
{
  "ok": true
}
```

</details>

<details>
<summary><strong>evaluateSlides</strong> — Score/evaluate slides and return metrics.</summary>

**Endpoint:** `/.netlify/functions/evaluateSlides`  
**Methods:** OPTIONS  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Env:** `FRONTEND_URL`, `OPENAI_API_KEY`
**Imports:** `openai`
**Notes:** Uses OpenAI API

**Example request**
```bash
curl 'https://<site>/.netlify/functions/evaluateSlides'
```

**Sample response**
```json
{
  "ok": true
}
```

</details>

<details>
<summary><strong>fetchSimilarSlides</strong> — Return similar slides by cosine similarity in Neo4j.</summary>

**Endpoint:** `/.netlify/functions/fetchSimilarSlides`  
**Methods:** GET  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Env:** `FRONTEND_URL`
**Notes:** Uses `withNeo4j` wrapper (Neo4j session); Neo4j access

**Example request**
```bash
curl 'https://<site>/.netlify/functions/fetchSimilarSlides'
```

**Sample response**
```json
{
  "slides": [
    {
      "id": "...",
      "title": "...",
      "object_id": "...",
      "content": "...",
      "percentage": 87,
      "similarity": 0.87
    }
  ]
}
```

</details>

<details>
<summary><strong>shortTitle</strong> — Generate short titles via LLM.</summary>

**Endpoint:** `/.netlify/functions/shortTitle`  
**Methods:** OPTIONS  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Env:** `FRONTEND_URL`, `OPENAI_API_KEY`
**Imports:** `openai`
**Notes:** Uses OpenAI API

**Example request**
```bash
curl 'https://<site>/.netlify/functions/shortTitle'
```

**Sample response**
```json
{
  "shortTitle": "..."
}
```

</details>

---

## Story Points & Authoring

| Function | Methods | Endpoint | Content-Type |
|---|---|---|---|
| `findStoryPointReference` | GET | `/.netlify/functions/findStoryPointReference` | application/json |
| `markSlidesOnCanvas` | GET | `/.netlify/functions/markSlidesOnCanvas` | application/json |
| `regenerateStoryPoint` | GET | `/.netlify/functions/regenerateStoryPoint` | application/json |
| `saveStoryPoint` | GET | `/.netlify/functions/saveStoryPoint` | application/json |

<details>
<summary><strong>findStoryPointReference</strong> — Utility endpoint.</summary>

**Endpoint:** `/.netlify/functions/findStoryPointReference`  
**Methods:** GET  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Notes:** Uses `withNeo4j` wrapper (Neo4j session); Neo4j access

**Example request**
```bash
curl 'https://<site>/.netlify/functions/findStoryPointReference'
```

**Sample response**
```json
{
  "ok": true
}
```

</details>

<details>
<summary><strong>markSlidesOnCanvas</strong> — Flag slides as `onCanvas` in Neo4j.</summary>

**Endpoint:** `/.netlify/functions/markSlidesOnCanvas`  
**Methods:** GET  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Env:** `FRONTEND_URL`
**Notes:** Uses `withNeo4j` wrapper (Neo4j session); Neo4j access

**Example request**
```bash
curl 'https://<site>/.netlify/functions/markSlidesOnCanvas'
```

**Sample response**
```json
{
  "ok": true
}
```

</details>

<details>
<summary><strong>regenerateStoryPoint</strong> — Regenerate slides for a Story Point using LLM + similarity.</summary>

**Endpoint:** `/.netlify/functions/regenerateStoryPoint`  
**Methods:** GET  
**Content-Type:** application/json
**Query params:** —
**Body keys:** `refinementPrompt`, `slideCount`, `storyPointId`
**Env:** `FRONTEND_URL`
**Notes:** Uses `withNeo4j` wrapper (Neo4j session); Neo4j access

**Example request**
```bash
curl 'https://<site>/.netlify/functions/regenerateStoryPoint'
```

**Sample response**
```json
{
  "slides": [
    {
      "id": "...",
      "object_id": "...",
      "content": "...",
      "percentage": 75
    }
  ]
}
```

</details>

<details>
<summary><strong>saveStoryPoint</strong> — Create/update a Story Point (description, shortTitle, slideCount).</summary>

**Endpoint:** `/.netlify/functions/saveStoryPoint`  
**Methods:** GET  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Notes:** Uses `withNeo4j` wrapper (Neo4j session); Neo4j access

**Example request**
```bash
curl 'https://<site>/.netlify/functions/saveStoryPoint'
```

**Sample response**
```json
{
  "ok": true
}
```

</details>

---

## User & Analytics

| Function | Methods | Endpoint | Content-Type |
|---|---|---|---|
| `check-consent` | OPTIONS | `/.netlify/functions/check-consent` | application/json |
| `log-interaction` | OPTIONS | `/.netlify/functions/log-interaction` | application/json |
| `save-consent` | OPTIONS | `/.netlify/functions/save-consent` | application/json |

<details>
<summary><strong>check-consent</strong> — Check consent state for the current user.</summary>

**Endpoint:** `/.netlify/functions/check-consent`  
**Methods:** OPTIONS  
**Content-Type:** application/json
**Query params:** —
**Body keys:** `prolificId`
**Env:** `DATABASE_URL`
**Imports:** `pg`
**Notes:** Requires valid Supabase session; Supabase access

**Example request**
```bash
curl 'https://<site>/.netlify/functions/check-consent'
```

**Sample response**
```json
{
  "hasConsent": true
}
```

</details>

<details>
<summary><strong>log-interaction</strong> — Utility endpoint.</summary>

**Endpoint:** `/.netlify/functions/log-interaction`  
**Methods:** OPTIONS  
**Content-Type:** application/json
**Query params:** —
**Body keys:** `action_type`, `component`, `duration_ms`, `ended_at`, `error_details`, `error_message`, `input_data`, `metadata`, `output_data`, `session_id`, `started_at`, `status`, `user_id`
**Env:** `DATABASE_URL`, `SUPABASE_JWT_SECRET`
**Imports:** `jose`, `pg`
**Notes:** Requires valid Supabase session; Requires `Authorization: Bearer <token>`; Supabase access

**Example request**
```bash
curl 'https://<site>/.netlify/functions/log-interaction' \
  -H 'Authorization: Bearer <token>'
```

**Sample response**
```json
{
  "ok": true
}
```

</details>

<details>
<summary><strong>save-consent</strong> — Store user consent state.</summary>

**Endpoint:** `/.netlify/functions/save-consent`  
**Methods:** OPTIONS  
**Content-Type:** application/json
**Query params:** —
**Body keys:** `consentTimestamp`, `prolificId`, `userId`
**Env:** `DATABASE_URL`
**Imports:** `pg`
**Notes:** Requires valid Supabase session; Supabase access

**Example request**
```bash
curl 'https://<site>/.netlify/functions/save-consent'
```

**Sample response**
```json
{
  "ok": true
}
```

</details>

---

## Utilities & Health

| Function | Methods | Endpoint | Content-Type |
|---|---|---|---|
| `loadFromNeo4j` | GET | `/.netlify/functions/loadFromNeo4j` | application/json |
| `test` | OPTIONS | `/.netlify/functions/test` | application/json |

<details>
<summary><strong>loadFromNeo4j</strong> — Load story graph/records from Neo4j.</summary>

**Endpoint:** `/.netlify/functions/loadFromNeo4j`  
**Methods:** GET  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Notes:** Uses `withNeo4j` wrapper (Neo4j session); Neo4j access

**Example request**
```bash
curl 'https://<site>/.netlify/functions/loadFromNeo4j'
```

**Sample response**
```json
{
  "ok": true
}
```

</details>

<details>
<summary><strong>test</strong> — Basic health check.</summary>

**Endpoint:** `/.netlify/functions/test`  
**Methods:** OPTIONS  
**Content-Type:** application/json
**Query params:** —
**Body keys:** —
**Env:** `FRONTEND_URL`
**Notes:** Requires valid Supabase session; Supabase access

**Example request**
```bash
curl 'https://<site>/.netlify/functions/test'
```

**Sample response**
```json
{
  "ok": true
}
```

</details>

---

## Shared & Helper Modules

### Function helpers (`netlify/functions/`)
| File | Kind | Named exports | Default export |
|---|---|---|---|
| `ensureUserProfile.js` | Supabase helper | `ensureUserProfile`, `requireAdmin` | no |
| `getCachedEmbedding.js` | OpenAI helper | — | yes |
| `loadSlides.js` | Neo4j helper | `loadSlides` | no |
| `neo4jConfig.js` | Neo4j helper | `driver` | no |
| `openai.js` | OpenAI helper | `getEmbedding`, `openai` | no |
| `supabaseAdminClient.js` | Supabase helper | `supabaseAdmin` | no |
| `verifySupabaseSession.js` | Supabase helper | `verifySupabaseSession` | no |

### Shared modules (`netlify/_shared/`)
| File | Named exports | Env | Imports |
|---|---|---|---|
| `dbRouter.js` | `CORS_HEADERS`, `cors`, `openNeo4jForRequest` | `FRONTEND_URL`, `JWT_SIGNING_KEY`, `NEO4J_NEW_PASSWORD`, `NEO4J_NEW_URI`, `NEO4J_NEW_USERNAME`, `NEO4J_PASSWORD`, `NEO4J_URI`, `NEO4J_USERNAME` | `jose`, `neo4j-driver` |
| `expSession.js` | `getExperimentalIdentityFromCookie` | `JWT_SIGNING_KEY` | `jose` |
| `withNeo4j.js` | `withNeo4j` | — | — |