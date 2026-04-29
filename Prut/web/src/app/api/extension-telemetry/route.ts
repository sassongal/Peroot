import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

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

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const rl = await checkRateLimit(`ext-tel:${user.id}`, "free");
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests", retryAfter: rl.reset }, { status: 429 });
  }

  let payload: z.infer<typeof Body>;
  try {
    payload = Body.parse(await req.json());
  } catch (err) {
    // Don't echo Zod's full error to the client — only surface the field paths
    // so callers can fix bad inputs without us reflecting the values back.
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
    const service = createServiceClient();
    const { error } = await service.from("extension_telemetry_events").insert({
      user_id: user.id,
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
}
