import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { getCronHealth } from "@/lib/cron-heartbeat";

export const GET = withAdmin(async () => {
  const jobs = await getCronHealth();

  // unknown = never ran yet (fresh deploy); treat as neutral, not failure
  const allHealthy = jobs.every((j) => j.status === "healthy" || j.status === "unknown");
  const hasUnknown = jobs.some((j) => j.status === "unknown");

  return NextResponse.json({
    healthy: allHealthy,
    hasUnknown,
    jobs,
    checkedAt: new Date().toISOString(),
  });
});
