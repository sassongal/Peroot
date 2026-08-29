# ADR-0003: Context extraction runs in-process on Vercel

**Status:** accepted · supersedes the Cloudflare Workers offload

Both extraction routes (`/api/context/extract-{url,file}`) parse
jsdom / pdfjs / mammoth / xlsx **in-process on Vercel**. The pipeline lives under
`src/lib/context/engine/extract/` behind the `extract()` seam (see CONTEXT.md).

A Cloudflare Workers CPU-offload bridge (`extract/remote.ts`, gated on
`EXTRACT_URL_HTTP_ENDPOINT` / `EXTRACT_FILE_HTTP_ENDPOINT` / `EXTRACT_SECRET`)
existed briefly and was **removed** in `c5681e4`. No `remote.ts` and no `EXTRACT_*`
variable is referenced anywhere in the tree today.

Worker source survives only on the `archive/cloudflare-migration` tag. A stale
`EXTRACT_SECRET` may still exist as a GitHub Actions secret; it is unused and can
be deleted.

> Update 2026-08-29: the worker directories (`extract-file-worker/`,
> `extract-url-worker/`) and the `EXTRACT_*` block in `.env.example` had actually
> lingered in-tree despite the statement above; they were deleted so the tree now
> matches this ADR.

**Consequence:** extraction is CPU-bound on the Vercel function. The memory
bounds that keep it safe (`readCapped`, the zip-bomb guard) are invariants owned
by `extract/limits.ts`, not per-adapter ad-hoc caps.
