/**
 * peroot-extract-url Worker
 *
 * Sibling Worker bound to main `peroot` via Service Binding `EXTRACT_URL`.
 * Holds heavy deps (jsdom + @mozilla/readability ~5 MiB) so the main Worker
 * stays under the 10 MiB Workers Paid script-size limit.
 *
 * Auth: requests must carry `X-Internal-Secret` matching env.EXTRACT_SECRET.
 * Service Binding traffic is in-CF only, but we still gate to make the
 * boundary explicit.
 */
import { extractUrl } from "./url";

interface Env {
  EXTRACT_SECRET: string;
  EXTRACT_CACHE?: KVNamespace;
  KV_TTL_SECONDS?: string;
}

interface RequestBody {
  url: string;
  jinaFallback?: boolean;
  timeoutMs?: number;
}

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

    let body: RequestBody;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }

    if (!body.url || typeof body.url !== "string") {
      return json({ ok: false, error: "Missing url" }, 400);
    }

    const cacheKey = env.EXTRACT_CACHE
      ? `url:${await sha256(`${normalizeUrlForCache(body.url)}|jina=${body.jinaFallback ? 1 : 0}`)}`
      : null;
    if (cacheKey && env.EXTRACT_CACHE) {
      try {
        const hit = await env.EXTRACT_CACHE.get(cacheKey, "json");
        if (hit) return json({ ok: true, result: hit }, 200, { "x-extract-cache": "HIT" });
      } catch (err) {
        console.warn("kv.get failed", err);
      }
    }

    try {
      const result = await extractUrl(body.url, {
        jinaFallback: Boolean(body.jinaFallback),
        timeoutMs: body.timeoutMs,
      });
      if (cacheKey && env.EXTRACT_CACHE) {
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
      const e = err as Error & { userFacing?: boolean };
      return json(
        {
          ok: false,
          error: e.message || "Extraction failed",
          userFacing: Boolean(e.userFacing),
        },
        e.userFacing ? 400 : 500,
      );
    }
  },
};

function normalizeUrlForCache(raw: string): string {
  try {
    const u = new URL(raw.trim());
    // Host is case-insensitive; path/query/fragment are not (RFC 3986 §6.2.2.1).
    u.hostname = u.hostname.toLowerCase();
    u.protocol = u.protocol.toLowerCase();
    return u.href;
  } catch {
    return raw.trim();
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
