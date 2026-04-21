// src/app/api/context/describe-image/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processAttachment } from "@/lib/context/engine";
import { checkExtractionLimit } from "@/lib/context/engine/extraction-rate-limit";
import { logger } from "@/lib/logger";
import type { PlanTier, ProcessingStage } from "@/lib/context/engine/types";

export const maxDuration = 30;

const MAX_IMAGE_SIZE_MB = 5;
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const enc = new TextEncoder();
function sseEvent(data: unknown): Uint8Array {
  return enc.encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: NextRequest) {
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
    const tier: PlanTier = profile?.plan_tier === "pro" ? "pro" : "free";

    const rl = await checkExtractionLimit(user.id, tier);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "חרגת ממכסת העיבוד היומית" },
        { status: 429, headers: { "Retry-After": String(rl.resetIn) } },
      );
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    if (!file) return NextResponse.json({ error: "לא נבחרה תמונה" }, { status: 400 });

    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_IMAGE_SIZE_MB) {
      return NextResponse.json(
        { error: `התמונה גדולה מדי (מקסימום ${MAX_IMAGE_SIZE_MB}MB)` },
        { status: 400 },
      );
    }
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "פורמט תמונה לא נתמך" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const id = crypto.randomUUID();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const block = await processAttachment({
            id,
            type: "image",
            userId: user.id,
            tier,
            buffer,
            filename: file.name,
            mimeType: file.type,
            onStage: (stage: ProcessingStage) => controller.enqueue(sseEvent({ stage })),
          });
          controller.enqueue(sseEvent({ block }));
        } catch (err) {
          await rl.rollback();
          logger.error("[context/describe-image]", err);
          controller.enqueue(sseEvent({ error: "שגיאה בעיבוד התמונה" }));
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
    logger.error("[context/describe-image] outer", err);
    return NextResponse.json({ error: "שגיאה בעיבוד התמונה" }, { status: 500 });
  }
}
