# Drop CF Workers — Migrate Extraction to Vercel In-Process

## Goal

Eliminate the Cloudflare Workers dependency for file and URL extraction, activate the existing in-process fallback on Vercel Pro, fix broken uploads, and save $5/month.

## Background

The two extraction Workers (`peroot-extract-url`, `peroot-extract-file`) were introduced when Vercel Hobby silently capped functions at 10s — too short for PDF/DOCX/jsdom parsing. Vercel Pro raises that cap to 300s. The Vercel codebase already contains a full in-process implementation (`pdfjs-dist`, `mammoth`, `jsdom`, `xlsx`) declared as `serverExternalPackages` in `next.config.ts`. That fallback path is activated simply by removing two env vars.

## Architecture

### Before (broken)
```
User uploads file / URL
  → Vercel function (extract-file / extract-url)
    → isRemoteFileConfigured() = true
      → POST to CF Worker (peroot-extract-file.workers.dev)
        → [fails / times out → red error notification]
```

### After
```
User uploads file / URL
  → Vercel function (extract-file / extract-url, maxDuration=60s)
    → dispatchFile() / extractUrl() — in-process
      → pdfjs-dist / mammoth / jsdom / xlsx
        → ContextBlock returned via SSE stream
```

The CF AI Gateway (`CF_AI_GATEWAY_URL`) is a separate Cloudflare product used for AI provider routing. It is unaffected by this change.

## Changes

### 1. Vercel Environment Variables
Remove from Vercel project env (production + preview):
- `EXTRACT_FILE_HTTP_ENDPOINT`
- `EXTRACT_URL_HTTP_ENDPOINT`
- `EXTRACT_SECRET`

No code change required — `isRemoteFileConfigured()` returns false, in-process path activates immediately.

### 2. Delete remote bridge
- Delete `src/lib/context/engine/extract/remote.ts`
- Delete any test files that test only the remote path

### 3. Simplify `engine/index.ts`
Remove the `isRemoteFileConfigured` / `isRemoteUrlConfigured` branches. Inline the in-process calls directly:

**File extraction (was):**
```ts
const r = isRemoteFileConfigured()
  ? await dispatchFileRemote(input.buffer, input.filename, input.mimeType)
  : await dispatchFile(input.buffer, input.filename, input.mimeType);
```
**After:**
```ts
const r = await dispatchFile(input.buffer, input.filename, input.mimeType);
```

**URL extraction (was):**
```ts
if (isRemoteUrlConfigured()) {
  r = await extractUrlRemote(input.url, { jinaFallback: limits.jinaFallback });
} else {
  const { extractUrl } = await import("./extract/url");
  r = await extractUrl(input.url, { jinaFallback: limits.jinaFallback });
}
```
**After:**
```ts
const { extractUrl } = await import("./extract/url");
r = await extractUrl(input.url, { jinaFallback: limits.jinaFallback });
```

### 4. Remove dead imports from `engine/index.ts`
Remove the `isRemoteUrlConfigured`, `isRemoteFileConfigured`, `extractUrlRemote`, `dispatchFileRemote` imports.

### 5. Cancel CF Workers plan
In Cloudflare dashboard: downgrade Workers plan from Paid ($5/month) to Free. The `workers.dev` subdomains can be left dormant or deleted — they no longer receive traffic.

## What Stays on Cloudflare
- `CF_AI_GATEWAY_URL` — AI provider routing gateway, free tier, unrelated to Workers.
- `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` — used only for the AI Gateway.

## Risks
- **Near-zero.** The in-process path has existing unit tests and is the original implementation.
- **Memory:** pdfjs-dist is memory-intensive. Vercel Pro functions get 1024MB — sufficient for the 10MB file size limit.
- **Cold starts:** First request after a cold start will dynamically import pdfjs/mammoth. Adds ~500ms on first hit; subsequent requests in the same instance are warm.

## Testing
After env vars are removed and code is deployed:
1. Upload a PDF (≤10MB) — should complete without error.
2. Upload a DOCX — should complete.
3. Paste a URL — should extract and enrich.
4. Run `npm run test` — all existing extraction tests pass.
