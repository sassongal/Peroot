import { createHash } from "crypto";
import { z } from "zod";
import {
  authenticateConnect,
  connectError,
  connectJson,
  handleOptions,
  logConnectUsage,
} from "@/lib/connect/auth";
import { ConnectEnhanceSchema, ConnectOpError, connectEnhance } from "@/lib/connect/ops";
import { refundCredit } from "@/lib/services/credit-service";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";

/**
 * POST /api/v1/enhance — Peroot Connect (key-authenticated, non-streaming).
 *
 * The agent-facing twin of the platform's enhance: same pipeline, same engine
 * skills / memory facts / model profiles / credits — collected into a single
 * JSON response. Model choice mirrors the platform exactly: `target_model`
 * (chatgpt | claude | gemini | general) plus optional `model_profile_slug`.
 *
 * Hardening (plan §16.4, §23.3):
 * - `Idempotency-Key` header: an agent retry within 15 minutes returns the
 *   SAME result without spending a second credit (Redis-cached, per user).
 * - 55s hard-stop: agents' MCP clients commonly cut off around 60s, so we
 *   answer `504 timeout` before that and refund the credit rather than let
 *   the agent hang. (The pipeline may still finish server-side — in that rare
 *   case the user finds the result in their history, on the house.)
 */
export const maxDuration = 60;

const HARD_STOP_MS = 55_000;
const IDEMPOTENCY_TTL_S = 900; // 15 minutes

export function OPTIONS() {
  return handleOptions();
}

function idemCacheKey(userId: string, idemKey: string): string {
  const digest = createHash("sha256").update(idemKey, "utf8").digest("hex");
  return `connect:idem:${userId}:${digest}`;
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
      "בקשה לא תקינה" + (detail ? `, ${detail}` : ""),
      "Invalid request" + (detail ? `, ${detail}` : ""),
    );
  }

  // Idempotent replay — never double-charge an agent retry.
  const idemHeader = req.headers.get("idempotency-key")?.trim().slice(0, 128) || null;
  const cacheKey = idemHeader ? idemCacheKey(auth.userId, idemHeader) : null;
  if (cacheKey) {
    try {
      const cached = await redis.get<Record<string, unknown>>(cacheKey);
      if (cached) {
        return connectJson({ ...cached, idempotent_replay: true });
      }
    } catch (e) {
      logger.warn("[Connect] idempotency read failed (continuing):", e);
    }
  }

  const rawKey = (req.headers.get("authorization") ?? "").slice(7).trim();
  const started = Date.now();
  try {
    const result = await Promise.race([
      connectEnhance(input, rawKey, auth.userId),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new ConnectOpError(
                504,
                "timeout",
                "השדרוג ארך יותר מדי, הקרדיט הוחזר",
                "Enhancement timed out, credit refunded",
              ),
            ),
          HARD_STOP_MS,
        ),
      ),
    ]);

    if (cacheKey) {
      try {
        await redis.set(cacheKey, result, { ex: IDEMPOTENCY_TTL_S });
      } catch (e) {
        logger.warn("[Connect] idempotency write failed:", e);
      }
    }

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
    if (e instanceof ConnectOpError && e.code === "timeout") {
      // The user paid for something the agent never received — give it back.
      void refundCredit(auth.userId).catch(() => {});
      logConnectUsage({
        userId: auth.userId,
        keyId: auth.keyId,
        endpoint: "/api/v1/enhance",
        durationMs: Date.now() - started,
        engineMode: input.mode,
      });
      return connectError(504, "timeout", e.message, e.messageEn ?? e.message);
    }
    if (e instanceof ConnectOpError) {
      return connectError(e.status, e.code, e.message, e.messageEn ?? e.message);
    }
    return connectError(500, "internal_error", "שגיאת שרת פנימית", "Internal server error");
  }
}
