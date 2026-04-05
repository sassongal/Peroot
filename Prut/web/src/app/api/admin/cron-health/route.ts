import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { getCronHealth } from "@/lib/cron-heartbeat";

export const GET = withAdmin(async () => {
  const jobs = await getCronHealth();

  const allHealthy = jobs.every((j) => j.status === "healthy");

  return NextResponse.json({
    healthy: allHealthy,
    jobs,
    checkedAt: new Date().toISOString(),
  });
});
