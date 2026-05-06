/**
 * Service-binding bridge for heavy extraction work.
 *
 * In Cloudflare Workers (production), the main `peroot` Worker delegates URL
 * and file extraction to sibling Workers (`peroot-extract-url`,
 * `peroot-extract-file`) via Service Bindings — heavy parsers (jsdom, mammoth,
 * xlsx, pdfjs-dist; ~7 MiB combined) live there, not here.
 *
 * Bundle-size constraint: this module MUST NOT statically or dynamically
 * import the heavy extractors. OpenNext follows `await import()` and would
 * inline jsdom/mammoth/xlsx/pdfjs-dist into the main Worker, defeating the
 * whole split. We pay the cost of an extra fetch/binding hop in dev to keep
 * the runtime topology identical to production.
 *
 * Resolution order (per call):
 *   1. Service Binding present (env.EXTRACT_URL / EXTRACT_FILE) → fetch via binding
 *   2. HTTP endpoint env var (EXTRACT_URL_HTTP_ENDPOINT / EXTRACT_FILE_HTTP_ENDPOINT)
 *      → fetch the deployed sibling Worker over HTTPS (use this in `next dev`)
 *   3. Throw — no transport available
 *
 * In dev, set the HTTP env vars to either the production worker URLs or a
 * local `wrangler dev` URL; either works because both paths are pure fetch.
 */
import type { UrlExtractionResult } from "./url";
import type { OfficeExtractionResult } from "./file-office";
import type { PdfExtractionResult } from "./file-pdf";
import type { TextExtractionResult } from "./file-text";

interface ServiceBinding {
  fetch: (req: Request) => Promise<Response>;
}

interface ExtractEnv {
  EXTRACT_URL?: ServiceBinding;
  EXTRACT_FILE?: ServiceBinding;
  EXTRACT_SECRET?: string;
  EXTRACT_URL_HTTP_ENDPOINT?: string;
  EXTRACT_FILE_HTTP_ENDPOINT?: string;
}

async function getEnv(): Promise<ExtractEnv> {
  // process.env is the dev fallback. In Workers, getCloudflareContext provides
  // bindings + secrets through env (process.env is also populated for vars).
  const fromProcess: ExtractEnv = {
    EXTRACT_SECRET: process.env.EXTRACT_SECRET,
    EXTRACT_URL_HTTP_ENDPOINT: process.env.EXTRACT_URL_HTTP_ENDPOINT,
    EXTRACT_FILE_HTTP_ENDPOINT: process.env.EXTRACT_FILE_HTTP_ENDPOINT,
  };
  try {
    const mod = await import("@opennextjs/cloudflare");
    const ctx = await mod.getCloudflareContext({ async: true });
    const cfEnv = (ctx?.env ?? {}) as ExtractEnv;
    return { ...fromProcess, ...cfEnv };
  } catch {
    return fromProcess;
  }
}

export async function extractUrlRemote(
  url: string,
  opts: { jinaFallback: boolean; timeoutMs?: number },
): Promise<UrlExtractionResult> {
  const env = await getEnv();
  if (!env.EXTRACT_SECRET) {
    throw new Error("EXTRACT_SECRET is not configured");
  }
  const body = JSON.stringify({ url, jinaFallback: opts.jinaFallback, timeoutMs: opts.timeoutMs });
  const headers = {
    "content-type": "application/json",
    "x-internal-secret": env.EXTRACT_SECRET,
  };

  let res: Response;
  if (env.EXTRACT_URL) {
    res = await env.EXTRACT_URL.fetch(
      new Request("https://internal/extract", { method: "POST", headers, body }),
    );
  } else if (env.EXTRACT_URL_HTTP_ENDPOINT) {
    res = await fetch(env.EXTRACT_URL_HTTP_ENDPOINT, { method: "POST", headers, body });
  } else {
    throw new Error("No EXTRACT_URL binding or EXTRACT_URL_HTTP_ENDPOINT configured");
  }

  const payload = (await res.json()) as
    | { ok: true; result: UrlExtractionResult }
    | { ok: false; error: string; userFacing?: boolean };
  if (!payload.ok) {
    const e = new Error(payload.error) as Error & { userFacing?: boolean };
    if (payload.userFacing) e.userFacing = true;
    throw e;
  }
  return payload.result;
}

export type FileExtractionResult =
  | OfficeExtractionResult
  | PdfExtractionResult
  | TextExtractionResult;

export async function dispatchFileRemote(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<FileExtractionResult> {
  const format = resolveFormat(mimeType, filename);

  // txt has no heavy deps — handle in-process to avoid an unnecessary hop.
  if (format === "txt") {
    const text = buffer.toString("utf-8");
    return { text, metadata: { format: "txt", characters: text.length } };
  }

  const env = await getEnv();
  if (!env.EXTRACT_SECRET) {
    throw new Error("EXTRACT_SECRET is not configured");
  }

  const ab = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(ab).set(buffer);
  const form = new FormData();
  form.set("file", new Blob([ab], { type: mimeType || "application/octet-stream" }), filename);
  form.set("format", format);

  const headers = { "x-internal-secret": env.EXTRACT_SECRET };

  let res: Response;
  if (env.EXTRACT_FILE) {
    res = await env.EXTRACT_FILE.fetch(
      new Request("https://internal/extract", { method: "POST", headers, body: form }),
    );
  } else if (env.EXTRACT_FILE_HTTP_ENDPOINT) {
    res = await fetch(env.EXTRACT_FILE_HTTP_ENDPOINT, { method: "POST", headers, body: form });
  } else {
    throw new Error("No EXTRACT_FILE binding or EXTRACT_FILE_HTTP_ENDPOINT configured");
  }

  const payload = (await res.json()) as
    | { ok: true; result: FileExtractionResult }
    | { ok: false; error: string };
  if (!payload.ok) throw new Error(payload.error);
  return payload.result;
}

const SUPPORTED_FILE_EXTENSIONS: Record<string, string> = {
  pdf: "pdf",
  docx: "docx",
  txt: "txt",
  csv: "csv",
  xlsx: "xlsx",
  xls: "xlsx",
};

function resolveFormat(
  mimeType: string,
  filename: string,
): "pdf" | "docx" | "txt" | "csv" | "xlsx" {
  const mimeMap: Record<string, string> = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
    "text/csv": "csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-excel": "xlsx",
  };
  const fromMime = mimeMap[mimeType];
  if (fromMime) return fromMime as "pdf" | "docx" | "txt" | "csv" | "xlsx";
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext && SUPPORTED_FILE_EXTENSIONS[ext]) {
    return SUPPORTED_FILE_EXTENSIONS[ext] as "pdf" | "docx" | "txt" | "csv" | "xlsx";
  }
  throw new Error(`Cannot resolve format for MIME "${mimeType}" / extension ".${ext ?? "?"}"`);
}
