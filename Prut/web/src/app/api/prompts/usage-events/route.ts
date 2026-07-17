import { NextResponse } from "next/server";
import { withUser } from "@/lib/api-middleware";

/**
 * GET /api/prompts/usage-events — the last 90 days of personal-library usage
 * events for the current user (feeds the Memory Palace). Auth + rate-limit
 * (usageEvents bucket) owned by withUser. The Palace clients treat any non-ok
 * response as an empty list, so the standard 401/429 shapes are safe here.
 */
export const GET = withUser(
  async (_req, ctx) => {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await ctx.db
      .from("personal_library_usage_events")
      .select("id, user_id, prompt_id, used_at, session_id, source")
      .eq("user_id", ctx.user!.id)
      .gte("used_at", since)
      .order("used_at", { ascending: false })
      .limit(2000);
    if (error) return NextResponse.json({ events: [] }, { status: 500 });
    return NextResponse.json({ events: data ?? [] });
  },
  { rateLimit: "usageEvents" },
);
