# Watermarking (Experimental Users)

**Goal:** display a *hard*, server-side watermark for experimental sessions:  
```
{PID} | {TS} — Traceable copy. Sharing prohibited.
```
…tiled across the entire slide, with angle/gap/opacity tuned for readability but not intrusive.

## How it works

1. **Login flow** (`qualtrics-exp-login` → `experimental-login`):
   - A JWT is minted with audience `inspira.auth` and includes at least a `pid` claim.
   - `experimental-login` verifies the token and sets a cookie:  
     `Set-Cookie: exp_session=<jwt>; HttpOnly; SameSite=Lax; Max-Age=10800`

2. **Image Proxy** (`slide` function):
   - Input: `GET /.netlify/functions/slide?objectId=<id>`.
   - Fetch the original from S3: `${S3_BASE}/${objectId}.{ext}`.
   - **If cookie is present and valid** → composite a tiled SVG watermark via `sharp` and return the resulting image; otherwise return the original.
   - Always respond with `Cache-Control: no-store` and `Referrer-Policy: same-origin`.

3. **Frontend**:
   - Always build image URLs via the **proxy** instead of S3 direct links.

## Suggested Overlay Parameters

These values are proven to be legible without overpowering the content:

- Angle: `-30°`
- Gap: `280` px
- Opacity: `0.12`
- Font size: `28`

## Timestamp (`TS`) Source

- Prefer a stable session timestamp (`start_ts` stored in the JWT).
- Fallback: derive from `iat` (`new Date(iat * 1000).toISOString()`).
- Format as `YYYY-MM-DD HH:mm UTC`.

## Performance

- `sharp` compositing of a small SVG overlay on slide-sized PNG/JPEG is typically fast.
- You may re-encode large PNGs to JPEG (quality 85) to keep payload small.

## Security Notes

- Avoid exposing raw S3 URLs; always serve via the proxy.
- Set `no-store` and avoid long-lived caching of watermarked images.
- If needed, make S3 bucket private and fetch with signed credentials from the function only.


## Implementation details

- Verification: read `exp_session` cookie and verify JWT (HS256) with `aud = inspira.auth`.
- Rendering: generate a **tiled** SVG with `{PID} | {TS}` at `-30°`, composite it over the source image via `sharp`.
- Timestamp (`TS`): prefer session `start_ts` (if present), fallback to `iat`. Format as `YYYY-MM-DD HH:mm UTC`.
- Caching: return `Cache-Control: no-store`; do not leak S3 origins in responses.