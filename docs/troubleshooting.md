# Troubleshooting

## Netlify build fails: `Could not resolve "sharp"`

Install dependencies in the **functions** folder (separate from root):
```bash
npm i --prefix netlify/functions sharp jose
```
Then clear the Netlify build cache and redeploy.

## Watermark shows only year/PID

Ensure you format a full timestamp (not just `new Date().getFullYear()`). Recommended pattern:
- Source: JWT `start_ts` (fallback to `iat`)
- Format: `YYYY-MM-DD HH:mm UTC`

## CORS / 401 from `getImageBase64`

`getImageBase64` requires a valid Supabase session. Ensure the client sends appropriate auth (cookie or header) and that `FRONTEND_URL` matches origin for CORS.



## `slide` returns 502 / 404

- Verify the `objectId` is **complete** (should include `_slide_<n>` suffix) and contains only `A–Z a–z 0–9 . _ -`.
- Ensure `S3_BASE` points to the correct bucket/prefix and that the image exists.
- Include the actual file extension in `S3_EXTS` (e.g., `png,jpg,jpeg,webp`).
- If the user is experimental but no watermark is visible, check that `JWT_SIGNING_KEY` is set and that the `exp_session` cookie is valid.