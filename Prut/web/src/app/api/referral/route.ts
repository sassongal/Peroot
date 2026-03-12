import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";

// GET: Get or create user's referral code
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Check for existing code
  const { data: existing } = await supabase
    .from("referral_codes")
    .select("code, uses_count, max_uses, credits_per_referral")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // Also get total credits earned from referrals
    const { count } = await supabase
      .from("referral_redemptions")
      .select("*", { count: "exact", head: true })
      .eq("code_id", (await supabase.from("referral_codes").select("id").eq("user_id", user.id).single()).data?.id);

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
  const { error } = await supabase
    .from("referral_codes")
    .insert({ user_id: user.id, code });

  if (error) {
    logger.error("[Referral] Failed to create code:", error);
    return NextResponse.json({ error: "Failed to create referral code" }, { status: 500 });
  }

  return NextResponse.json({
    code,
    uses: 0,
    maxUses: 50,
    creditsPerReferral: 5,
    totalReferrals: 0,
  });
}

const RedeemSchema = z.object({
  code: z.string().min(4).max(20),
});

// POST: Redeem a referral code
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const json = await req.json();
    const { code } = RedeemSchema.parse(json);

    const { data, error } = await supabase.rpc("redeem_referral_code", {
      referral_code: code,
    });

    if (error) {
      logger.error("[Referral] RPC error:", error);
      return NextResponse.json({ error: "Failed to redeem code" }, { status: 500 });
    }

    if (!data?.success) {
      return NextResponse.json({ error: data?.error || "Failed to redeem" }, { status: 400 });
    }

    return NextResponse.json({ success: true, creditsAwarded: data.credits_awarded });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid code format" }, { status: 400 });
    }
    logger.error("[Referral] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

function generateCode(userId: string): string {
  // Create a short readable code: "PR-" + first 4 chars of userId + random 4
  const prefix = userId.replace(/-/g, "").slice(0, 4).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PR-${prefix}${random}`;
}
