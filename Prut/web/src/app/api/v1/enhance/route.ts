import { z } from "zod";
import {
  authenticateConnect,
  connectError,
  connectJson,
  handleOptions,
  logConnectUsage,
} from "@/lib/connect/auth";
import { ConnectEnhanceSchema, ConnectOpError, connectEnhance } from "@/lib/connect/ops";

/**
 * POST /api/v1/enhance — Peroot Connect (key-authenticated, non-streaming).
 *
 * The agent-facing twin of the platform's enhance: same pipeline, same engine
 * skills / memory facts / model profiles / credits — collected into a single
 * JSON response. Model choice mirrors the platform exactly: `target_model`
 * (chatgpt | claude | gemini | general) plus optional `model_profile_slug`.
 */
export const maxDuration = 60;

export function OPTIONS() {
  return handleOptions();
}

export async function POST(req: Request) {
  const auth = await authenticateConnect(req);
  if (auth instanceof Response) return auth;

  let input;
  try {
    input = ConnectEnhanceSchema.parse(await req.json());
  } catch (e) {
    const detail = e instanceof z.ZodError ? e.issues[0]?.message : undefined;
    return connectError(
      400,
      "invalid_request",
      "בקשה לא תקינה" + (detail ? ` — ${detail}` : ""),
      "Invalid request" + (detail ? ` — ${detail}` : ""),
    );
  }

  const rawKey = (req.headers.get("authorization") ?? "").slice(7).trim();
  const started = Date.now();
  try {
    const result = await connectEnhance(input, rawKey, auth.userId);
    logConnectUsage({
      userId: auth.userId,
      keyId: auth.keyId,
      endpoint: "/api/v1/enhance",
      durationMs: Date.now() - started,
      engineMode: input.mode,
      cacheHit: result.cache_hit,
    });
    return connectJson(result);
  } catch (e) {
    if (e instanceof ConnectOpError) {
      return connectError(e.status, e.code, e.message, e.messageEn ?? e.message);
    }
    return connectError(500, "internal_error", "שגיאת שרת פנימית", "Internal server error");
  }
}
