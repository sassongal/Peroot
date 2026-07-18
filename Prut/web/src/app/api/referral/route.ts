import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { randomBytes } from "crypto";
import { withUser } from "@/lib/api-middleware";

// GET: Get or create the user's own referral code (no credit mutation).
// Auth owned by withUser.
export const GET = withUser(
  async (_req, ctx) => {
    const supabase = ctx.db;
    const user = ctx.user!;

    // Check for existing code
    const { data: existing } = await supabase
      .from("referral_codes")
      .select("id, code, uses_count, max_uses, credits_per_referral")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      const { count } = await supabase
        .from("referral_redemptions")
        .select("*", { count: "exact", head: true })
        .eq("code_id", existing.id);

      return NextResponse.json({
        code: existing.code,
        uses: existing.uses_count,
        maxUses: existing.max_uses,
        creditsPerReferral: existing.credits_per_referral,
        totalReferrals: count || 0,
      });
    }

    // Generate a new referral code
    const code = generateCode(user.id);
    const { error } = await supabase.from("referral_codes").insert({ user_id: user.id, code });

    if (error) {
      logger.error("[Referral] Failed to create code:", error);
      return NextResponse.json(
        { error: "יצירת קוד ההפניה נכשלה", code: "create_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      code,
      uses: 0,
      maxUses: 50,
      creditsPerReferral: 5,
      totalReferrals: 0,
    });
  },
  { rateLimit: "none" },
);

const RedeemSchema = z.object({
  code: z.string().min(4).max(20),
});

// POST: Redeem a referral code. The redemption + credit grant happen atomically
// inside the redeem_referral_code RPC — withUser only owns auth + the referral
// rate-limit here; the grant logic is untouched.
export const POST = withUser(
  async (req, ctx) => {
    const supabase = ctx.db;
    try {
      const json = await req.json();
      const { code } = RedeemSchema.parse(json);

      const { data, error } = await supabase.rpc("redeem_referral_code", { referral_code: code });

      if (error) {
        logger.error("[Referral] RPC error:", error);
        return NextResponse.json(
          { error: "מימוש הקוד נכשל", code: "redeem_failed" },
          { status: 500 },
        );
      }

      if (!data?.success) {
        return NextResponse.json({ error: data?.error || "Failed to redeem" }, { status: 400 });
      }

      return NextResponse.json({ success: true, creditsAwarded: data.credits_awarded });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "פורמט הקוד אינו תקין", code: "invalid_code" },
          { status: 400 },
        );
      }
      logger.error("[Referral] Error:", error);
      return NextResponse.json(
        { error: "שגיאת שרת פנימית", code: "internal_error" },
        { status: 500 },
      );
    }
  },
  { rateLimit: "referral" },
);

function generateCode(userId: string): string {
  // Create a short readable code: "PR-" + first 4 chars of userId + crypto-random 6
  const prefix = userId.replace(/-/g, "").slice(0, 4).toUpperCase();
  const random = randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
  return `PR-${prefix}${random}`;
}
