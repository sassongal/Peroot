// src/app/api/context/extract-url/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processAttachment } from "@/lib/context/engine";
import { checkExtractionLimit } from "@/lib/context/engine/extraction-rate-limit";
import { logger } from "@/lib/logger";
import type { PlanTier, ProcessingStage } from "@/lib/context/engine/types";

export const maxDuration = 60;

const enc = new TextEncoder();
function sseEvent(data: unknown): Uint8Array {
  return enc.encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: NextRequest) {
  // Validate body before auth/rate-limit — malformed requests must not consume quota
  let url: string;
  try {
    const body = await request.json();
    url = body?.url;
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו תקין" }, { status: 400 });
  }
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL חסר" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_tier")
      .eq("id", user.id)
      .maybeSingle();
    const tier: PlanTier =
      profile?.plan_tier === "pro" || profile?.plan_tier === "admin" ? "pro" : "free";

    const rl = await checkExtractionLimit(user.id, tier);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "חרגת ממכסת העיבוד היומית" },
        { status: 429, headers: { "Retry-After": String(rl.resetIn) } },
      );
    }

    const id = crypto.randomUUID();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const block = await processAttachment({
            id,
            type: "url",
            userId: user.id,
            tier,
            url,
            onStage: (stage: ProcessingStage) => controller.enqueue(sseEvent({ stage })),
          });
          controller.enqueue(sseEvent({ block }));
        } catch (err) {
          await rl.rollback();
          logger.error("[context/extract-url]", err);
          const isUserFacing =
            err instanceof Error && (err as Error & { userFacing?: boolean }).userFacing === true;
          const msg = isUserFacing ? (err as Error).message : "שגיאה בעיבוד הקישור";
          controller.enqueue(sseEvent({ error: msg }));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    logger.error("[context/extract-url] outer", err);
    return NextResponse.json({ error: "שגיאה בעיבוד הקישור" }, { status: 500 });
  }
}
