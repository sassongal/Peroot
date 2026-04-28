// src/app/api/context/extract-file/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processAttachment } from "@/lib/context/engine";
import { checkExtractionLimit } from "@/lib/context/engine/extraction-rate-limit";
import { logger } from "@/lib/logger";
import { MAX_FILE_SIZE_MB, SUPPORTED_FILE_EXTENSIONS } from "@/lib/context/engine/extract";
import type { PlanTier, ProcessingStage } from "@/lib/context/engine/types";

export const maxDuration = 60;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

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
    if (!user) {
      return NextResponse.json({ error: "נדרשת התחברות", code: "auth_required" }, { status: 401 });
    }

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
        {
          error: `חרגת ממכסת העיבוד היומית (${rl.limit}). נסה שוב מחר או שדרג ל-Pro.`,
          remaining: 0,
        },
        { status: 429, headers: { "Retry-After": String(rl.resetIn) } },
      );
    }

    // Reject oversized requests before buffering the body — Content-Length is a hint
    // (can be spoofed) but prevents accidental OOM from honest large uploads.
    const rawContentLength = request.headers.get("content-length");
    if (rawContentLength) {
      const bytes = parseInt(rawContentLength, 10);
      if (!Number.isNaN(bytes) && bytes > (MAX_FILE_SIZE_MB + 2) * 1024 * 1024) {
        await rl.rollback();
        return NextResponse.json(
          { error: `הקובץ גדול מדי (מקסימום ${MAX_FILE_SIZE_MB}MB)` },
          { status: 413 },
        );
      }
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      await rl.rollback();
      return NextResponse.json({ error: "לא נבחר קובץ" }, { status: 400 });
    }

    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_FILE_SIZE_MB) {
      await rl.rollback();
      return NextResponse.json(
        { error: `הקובץ גדול מדי (מקסימום ${MAX_FILE_SIZE_MB}MB)` },
        { status: 400 },
      );
    }

    // Pre-validate format before buffering — avoids allocating 10 MB for unsupported types
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_MIME_TYPES.has(file.type) && !SUPPORTED_FILE_EXTENSIONS[ext]) {
      await rl.rollback();
      return NextResponse.json({ error: "פורמט קובץ לא נתמך" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const id = crypto.randomUUID();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const block = await processAttachment({
            id,
            type: "file",
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
          logger.error("[context/extract-file]", err);
          controller.enqueue(sseEvent({ error: "שגיאה בעיבוד הקובץ" }));
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
    logger.error("[context/extract-file] outer", err);
    return NextResponse.json({ error: "שגיאה בעיבוד הקובץ" }, { status: 500 });
  }
}
