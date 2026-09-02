import { NextResponse } from "next/server";

import { withAdmin } from "@/lib/api-middleware";
import { parseCapabilityMode } from "@/lib/capability-mode";
import { shippedEngineBaselines } from "@/lib/engines/shipped-baselines";

/**
 * GET /api/admin/engine-shipped-baseline?mode=<capability mode>
 * Returns the in-repo default templates for drift comparison with
 * `prompt_engines`, for every mode (it used to cover image and video only).
 */
export const GET = withAdmin(async (req) => {
  const { searchParams } = new URL(req.url);
  const modeRaw = searchParams.get("mode");
  if (!modeRaw?.trim()) {
    return NextResponse.json({ error: "mode query required" }, { status: 400 });
  }

  const mode = parseCapabilityMode(modeRaw);
  const baseline = shippedEngineBaselines()[mode];
  if (!baseline) {
    return NextResponse.json({ error: `No shipped baseline for ${mode}` }, { status: 400 });
  }
  return NextResponse.json({ ok: true, baseline });
});
