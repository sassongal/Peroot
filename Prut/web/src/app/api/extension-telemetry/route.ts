import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { withUser } from "@/lib/api-middleware";

export const dynamic = "force-dynamic";

const ALLOWED_EVENTS = [
  "selector_miss",
  "chip_click",
  "quicklib_open",
  "quicklib_insert",
  "popup_enhance",
  "score_gate_hit",
  "cache_hit",
] as const;

const META_MAX_KEYS = 25;
const META_MAX_BYTES = 4096;

const Body = z.object({
  event: z.enum(ALLOWED_EVENTS),
  site: z.enum(["chatgpt", "claude", "gemini"]).optional(),
  ext_version: z.string().max(32).optional(),
  target_model: z.string().max(64).optional(),
  latency_ms: z.number().int().min(0).max(60_000).optional(),
  success: z.boolean().optional(),
  chain_index: z.number().int().min(-1).max(20).optional(),
  // Bound `meta` so a hostile client can't fill the JSONB column with
  // arbitrarily large payloads. Cap by entry count and serialized size.
  meta: z
    .record(z.string().max(64), z.unknown())
    .refine((m) => Object.keys(m).length <= META_MAX_KEYS, {
      message: `meta exceeds ${META_MAX_KEYS} keys`,
    })
    .refine(
      (m) => {
        try {
          return JSON.stringify(m).length <= META_MAX_BYTES;
        } catch {
          return false;
        }
      },
      { message: `meta exceeds ${META_MAX_BYTES} bytes serialized` },
    )
    .optional(),
});

/**
 * POST /api/extension-telemetry
 * withUser owns auth + a per-user free-bucket rate limit (keyed ext-tel:<uid>).
 * Events are written via the service-role client (forceServiceClient), scoped to
 * ctx.user.id.
 */
export const POST = withUser(
  async (req, ctx): Promise<Response> => {
    let payload: z.infer<typeof Body>;
    try {
      payload = Body.parse(await req.json());
    } catch (err) {
      // Only surface the field paths, never the reflected values.
      const fields =
        err instanceof z.ZodError
          ? err.issues.map((i) => i.path.join(".")).filter(Boolean)
          : undefined;
      return NextResponse.json(
        { error: "Invalid body", ...(fields && fields.length ? { fields } : {}) },
        { status: 400 },
      );
    }

    try {
      const { error } = await ctx.db.from("extension_telemetry_events").insert({
        user_id: ctx.user!.id,
        event: payload.event,
        site: payload.site ?? null,
        ext_version: payload.ext_version ?? null,
        target_model: payload.target_model ?? null,
        latency_ms: payload.latency_ms ?? null,
        success: payload.success ?? null,
        chain_index: payload.chain_index ?? null,
        meta: payload.meta ?? {},
      });
      if (error) {
        logger.warn("[extension-telemetry] insert failed", { error: error.message });
        return NextResponse.json({ error: "Insert failed" }, { status: 500 });
      }
      return new NextResponse(null, { status: 204 });
    } catch (err) {
      logger.error("[extension-telemetry] threw", { err: (err as Error).message });
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  },
  {
    rateLimit: "free",
    rateLimitKey: ({ user }) => `ext-tel:${user!.id}`,
    forceServiceClient: true,
  },
);
