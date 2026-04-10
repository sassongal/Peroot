import { NextResponse } from "next/server";

import { validateAdminSession } from "@/lib/admin/admin-security";
import { CapabilityMode, parseCapabilityMode } from "@/lib/capability-mode";
import { getShippedImageEngineBaseline } from "@/lib/engines/image-engine";
import { getShippedVideoEngineBaseline } from "@/lib/engines/video-engine";

/**
 * GET /api/admin/engine-shipped-baseline?mode=video_generation|image_generation
 * Returns in-repo default templates for drift comparison with `prompt_engines`.
 */
export async function GET(req: Request) {
  const { error: authError } = await validateAdminSession();
  if (authError) {
    return NextResponse.json(
      { error: authError },
      { status: authError === "Unauthorized" ? 401 : 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const modeRaw = searchParams.get("mode");
  if (!modeRaw?.trim()) {
    return NextResponse.json({ error: "mode query required" }, { status: 400 });
  }

  const mode = parseCapabilityMode(modeRaw);
  if (mode === CapabilityMode.VIDEO_GENERATION) {
    return NextResponse.json({ ok: true, baseline: getShippedVideoEngineBaseline() });
  }
  if (mode === CapabilityMode.IMAGE_GENERATION) {
    return NextResponse.json({ ok: true, baseline: getShippedImageEngineBaseline() });
  }

  return NextResponse.json(
    { error: "Only video_generation and image_generation have shipped baselines here" },
    { status: 400 }
  );
}
