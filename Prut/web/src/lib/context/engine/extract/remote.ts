/**
 * HTTP bridge to sibling Cloudflare Workers that hold heavy extraction deps.
 *
 * Active when EXTRACT_URL_HTTP_ENDPOINT / EXTRACT_FILE_HTTP_ENDPOINT and
 * EXTRACT_SECRET are set in env. When unset, callers must fall back to the
 * in-process extractors (./url, ./index dispatchFile).
 *
 * This module deliberately uses only `fetch` + `FormData` — no static or
 * dynamic imports of jsdom/pdfjs/mammoth/xlsx — so adding it to the Vercel
 * bundle costs nothing.
 */
import type { FileDispatchResult } from "./index";

interface UrlExtractionResult {
  text: string;
  metadata: Record<string, unknown> & {
    format: "url";
    title?: string;
    sourceUrl: string;
  };
}

export function isRemoteUrlConfigured(): boolean {
  return Boolean(process.env.EXTRACT_URL_HTTP_ENDPOINT && process.env.EXTRACT_SECRET);
}

export function isRemoteFileConfigured(): boolean {
  return Boolean(process.env.EXTRACT_FILE_HTTP_ENDPOINT && process.env.EXTRACT_SECRET);
}

export async function extractUrlRemote(
  url: string,
  opts: { jinaFallback: boolean; timeoutMs?: number },
): Promise<UrlExtractionResult> {
  const endpoint = process.env.EXTRACT_URL_HTTP_ENDPOINT!;
  const secret = process.env.EXTRACT_SECRET!;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-secret": secret,
    },
    body: JSON.stringify({ url, jinaFallback: opts.jinaFallback, timeoutMs: opts.timeoutMs }),
  });
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

export async function dispatchFileRemote(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<FileDispatchResult> {
  const format = resolveFormat(mimeType, filename);

  // txt has no heavy deps — handle in-process to avoid a remote hop.
  if (format === "txt") {
    const text = buffer.toString("utf-8");
    return { text, metadata: { format: "txt", characters: text.length } };
  }

  const endpoint = process.env.EXTRACT_FILE_HTTP_ENDPOINT!;
  const secret = process.env.EXTRACT_SECRET!;

  const ab = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(ab).set(buffer);
  const form = new FormData();
  form.set("file", new Blob([ab], { type: mimeType || "application/octet-stream" }), filename);
  form.set("format", format);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "x-internal-secret": secret },
    body: form,
  });
  const payload = (await res.json()) as
    | { ok: true; result: FileDispatchResult }
    | { ok: false; error: string };
  if (!payload.ok) throw new Error(payload.error);
  return payload.result;
}

const SUPPORTED_EXT: Record<string, string> = {
  pdf: "pdf",
  docx: "docx",
  txt: "txt",
  csv: "csv",
  xlsx: "xlsx",
  xls: "xlsx",
};

function resolveFormat(mimeType: string, filename: string): string {
  const mimeMap: Record<string, string> = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
    "text/csv": "csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-excel": "xlsx",
  };
  if (mimeMap[mimeType]) return mimeMap[mimeType];
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext && SUPPORTED_EXT[ext]) return SUPPORTED_EXT[ext];
  throw new Error(`Cannot resolve format for MIME "${mimeType}" / extension ".${ext ?? "?"}"`);
}
