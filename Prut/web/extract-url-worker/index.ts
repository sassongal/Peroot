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
}

interface RequestBody {
  url: string;
  jinaFallback?: boolean;
  timeoutMs?: number;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }

    const secret = request.headers.get("x-internal-secret");
    if (!env.EXTRACT_SECRET || secret !== env.EXTRACT_SECRET) {
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

    try {
      const result = await extractUrl(body.url, {
        jinaFallback: Boolean(body.jinaFallback),
        timeoutMs: body.timeoutMs,
      });
      return json({ ok: true, result }, 200);
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

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
