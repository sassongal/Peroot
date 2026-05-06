/**
 * peroot-extract-file Worker
 *
 * Sibling Worker bound to main `peroot` via Service Binding `EXTRACT_FILE`.
 * Holds heavy parsing deps (mammoth, xlsx, pdfjs-dist, papaparse) so the main
 * Worker stays under the 10 MiB Workers Paid script-size limit.
 *
 * Auth: requests must carry `X-Internal-Secret` matching env.EXTRACT_SECRET.
 *
 * Wire format: multipart/form-data with fields
 *   - file:   the binary blob
 *   - format: "docx" | "xlsx" | "csv" | "pdf"
 */
import { extractDocx, extractCsv, extractXlsx } from "./file-office";
import { extractPdf } from "./file-pdf";

interface Env {
  EXTRACT_SECRET: string;
  EXTRACT_CACHE?: KVNamespace;
  KV_TTL_SECONDS?: string;
}

type Format = "docx" | "xlsx" | "csv" | "pdf";

const DEFAULT_TTL = 60 * 60 * 24 * 30;
const MAX_CACHE_BYTES = 24 * 1024 * 1024;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }

    const secret = request.headers.get("x-internal-secret");
    if (!env.EXTRACT_SECRET || !timingSafeEqual(secret ?? "", env.EXTRACT_SECRET)) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return json({ ok: false, error: "Invalid multipart body" }, 400);
    }

    const file = form.get("file");
    const format = form.get("format");

    if (!(file instanceof Blob)) {
      return json({ ok: false, error: "Missing file" }, 400);
    }
    if (typeof format !== "string" || !isFormat(format)) {
      return json({ ok: false, error: "Missing or invalid format" }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const cacheKey = env.EXTRACT_CACHE ? `file:${format}:${await sha256(arrayBuffer)}` : null;
    if (cacheKey && env.EXTRACT_CACHE) {
      try {
        const hit = await env.EXTRACT_CACHE.get(cacheKey, "json");
        if (hit) return json({ ok: true, result: hit }, 200, { "x-extract-cache": "HIT" });
      } catch (err) {
        console.warn("kv.get failed", err);
      }
    }

    try {
      let result;
      switch (format) {
        case "docx":
          result = await extractDocx(buffer);
          break;
        case "xlsx":
          result = await extractXlsx(buffer);
          break;
        case "csv":
          result = await extractCsv(buffer);
          break;
        case "pdf":
          result = await extractPdf(buffer);
          break;
      }
      if (cacheKey && env.EXTRACT_CACHE && result) {
        const serialized = JSON.stringify(result);
        if (serialized.length <= MAX_CACHE_BYTES) {
          const ttl = Number(env.KV_TTL_SECONDS) || DEFAULT_TTL;
          ctx.waitUntil(
            env.EXTRACT_CACHE.put(cacheKey, serialized, { expirationTtl: ttl }).catch((err) =>
              console.warn("kv.put failed", err),
            ),
          );
        }
      }
      return json({ ok: true, result }, 200, { "x-extract-cache": "MISS" });
    } catch (err) {
      const e = err as Error;
      return json({ ok: false, error: e.message || "Extraction failed" }, 500);
    }
  },
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sha256(input: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isFormat(v: string): v is Format {
  return v === "docx" || v === "xlsx" || v === "csv" || v === "pdf";
}

function json(
  payload: unknown,
  status: number,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extraHeaders },
  });
}
