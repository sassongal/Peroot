import { NextResponse } from "next/server";
import { withUser } from "@/lib/api-middleware";

/**
 * POST /api/user/onboarding/complete
 *
 * Marks in-app onboarding as finished. Welcome email is sent once at signup
 * (auth callback + onboarding_welcome), not here — avoids duplicate automated mail.
 * Auth owned by withUser.
 */
export const POST = withUser(
  async (_req, ctx) => {
    const { error: updateError } = await ctx.db
      .from("profiles")
      .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
      .eq("id", ctx.user!.id);

    if (updateError) {
      return NextResponse.json(
        { error: "השלמת ההכרות נכשלה", code: "onboarding_failed" },
        { status: 500 },
      );
    }

    // Log onboarding completion (fire-and-forget)
    void ctx.db.from("activity_logs").insert({
      user_id: ctx.user!.id,
      action: "onboarding_complete",
      entity_type: "profile",
      entity_id: ctx.user!.id,
      details: {},
    });

    return NextResponse.json({ success: true, message: "Onboarding completed successfully" });
  },
  { rateLimit: "none" },
);
