import { NextResponse } from "next/server";
import { AchievementTracker } from "@/lib/intelligence/achievement-tracker";
import { z } from "zod";
import { withUser } from "@/lib/api-middleware";

const AwardSchema = z.object({
  achievementId: z.string().min(1),
});

/**
 * POST /api/user/achievements/award
 *
 * Securely award a whitelisted achievement from the client (e.g. Onboarding).
 * Auth owned by withUser; rate-limited to 10/24h on the shared "free" bucket
 * under an isolated `achievement:<uid>` key so it never collides with other
 * free-bucket usage.
 */
export const POST = withUser(
  async (req, ctx) => {
    const body = await req.json();
    const parsed = AwardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "בקשה לא תקינה", code: "invalid_request" },
        { status: 400 },
      );
    }
    const { achievementId } = parsed.data;

    // Only allow certain achievements to be awarded directly from UI
    const whitelist = ["pioneer"];
    if (!whitelist.includes(achievementId)) {
      return NextResponse.json({ error: "Restricted achievement" }, { status: 403 });
    }

    const success = await AchievementTracker.award(ctx.user!.id, achievementId);
    return NextResponse.json({ success });
  },
  {
    rateLimit: "free",
    rateLimitKey: ({ user }) => `achievement:${user!.id}`,
  },
);
