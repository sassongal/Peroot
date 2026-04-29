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

const Body = z.object({
  event: z.enum(ALLOWED_EVENTS),
  site: z.enum(["chatgpt", "claude", "gemini"]).optional(),
  ext_version: z.string().max(32).optional(),
  target_model: z.string().max(64).optional(),
  latency_ms: z.number().int().min(0).max(60_000).optional(),
  success: z.boolean().optional(),
  chain_index: z.number().int().min(-1).max(20).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
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
    return NextResponse.json(
      { error: "Invalid body", detail: (err as Error).message },
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
