import { NextResponse } from "next/server";

import { withAdmin } from "@/lib/api-middleware";
import { CapabilityMode, parseCapabilityMode } from "@/lib/capability-mode";
import { getShippedImageEngineBaseline } from "@/lib/engines/image-engine";
import { getShippedVideoEngineBaseline } from "@/lib/engines/video-engine";

/**
 * GET /api/admin/engine-shipped-baseline?mode=video_generation|image_generation
 * Returns in-repo default templates for drift comparison with `prompt_engines`.
 */
export const GET = withAdmin(async (req) => {
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
});
