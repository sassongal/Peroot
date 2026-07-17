import { NextResponse } from "next/server";
import { withUser } from "@/lib/api-middleware";

/**
 * GET /api/user/achievements
 * Fetches unlocked achievements for the current user. Auth owned by withUser.
 */
export const GET = withUser(
  async (_req, ctx) => {
    const { data } = await ctx.db.from("user_achievements").select("*").eq("user_id", ctx.user!.id);
    return NextResponse.json(data || []);
  },
  { rateLimit: "none" },
);
