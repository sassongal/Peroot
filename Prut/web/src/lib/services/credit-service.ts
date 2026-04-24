/**
 * CreditService — centralised credit management for Peroot.
 *
 * Handles:
 *  - Atomic check-and-decrement via `refresh_and_decrement_credits` RPC
 *  - Legacy fallback path (daily reset + `check_and_decrement_credits`)
 *  - Credit refunds via `refund_credit` RPC using a service-role client
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreditCheckResult {
  allowed: boolean;
  remaining: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Credit Ledger (audit trail)
// ---------------------------------------------------------------------------

export async function logCreditChange(
  userId: string,
  delta: number,
  balanceAfter: number,
  reason: string,
  source: string = "system",
): Promise<void> {
  try {
    const client = createServiceClient();
    await client.rpc("log_credit_change", {
      p_user_id: userId,
      p_delta: delta,
      p_balance_after: balanceAfter,
      p_reason: reason,
      p_source: source,
    });
  } catch (e) {
    // Never block credit operations — ledger is best-effort
    logger.error("[CreditService] Failed to log credit change:", e);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Atomically refresh (if needed) and decrement credits for a user.
 *
 * Attempts the modern `refresh_and_decrement_credits` RPC first.
 * If that function does not exist in the database yet, falls back to the
 * legacy two-step path: manual daily-reset + `check_and_decrement_credits`.
 *
 * @param userId   The user whose credits to consume.
 * @param tier     The user's plan tier — used by the RPC for limit look-up.
 * @param queryClient  A Supabase client that can read profile / settings rows
 *                     (may be the user-scoped client or a service-role client).
 * @param amount   Number of credits to spend (defaults to 1).
 */
export async function checkAndDecrementCredits(
  userId: string,
  tier: string,
  queryClient: SupabaseClient,
  amount = 1,
): Promise<CreditCheckResult> {
  // --- Primary path: atomic RPC -------------------------------------------
  const { data: creditRes, error: rpcError } = await queryClient.rpc(
    "refresh_and_decrement_credits",
    {
      target_user_id: userId,
      amount_to_spend: amount,
      user_tier: tier,
    },
  );

  if (!rpcError && creditRes?.success) {
    logCreditChange(userId, -amount, creditRes.current_balance ?? 0, "spend");
    return {
      allowed: true,
      remaining: creditRes.current_balance ?? 0,
    };
  }

  // --- Legacy fallback: function doesn't exist yet -------------------------
  // This is an ops incident — the atomic RPC must exist in prod. The non-atomic
  // fallback has a known double-spend race under concurrent requests, so we
  // only allow it when an explicit opt-in env flag is set. Otherwise fail closed.
  const isNotFound =
    rpcError?.message?.includes("function") && rpcError?.message?.includes("does not exist");

  if (isNotFound) {
    if (process.env.ALLOW_LEGACY_CREDIT_FALLBACK === "1") {
      logger.error(
        "[CreditService] Atomic RPC missing — using legacy non-atomic fallback (double-spend risk)",
      );
      return legacyCheckAndDecrement(userId, tier, queryClient, amount);
    }
    logger.error(
      "[CreditService] Atomic RPC refresh_and_decrement_credits not found in DB — failing closed",
    );
    return {
      allowed: false,
      remaining: 0,
      error: "Credit service unavailable",
    };
  }

  // --- Genuine error or insufficient credits ------------------------------
  return {
    allowed: false,
    remaining: creditRes?.current_balance ?? 0,
    error: creditRes?.error || "Insufficient credits or profile not found",
  };
}

/**
 * Refund credits to a user.  Always uses a service-role client so that the
 * refund succeeds regardless of how the original request was authenticated.
 *
 * @param userId  The user to refund.
 * @param amount  Number of credits to restore (defaults to 1).
 */
export async function refundCredit(userId: string, amount = 1): Promise<void> {
  try {
    const client = createServiceClient();
    await client.rpc("refund_credit", {
      target_user_id: userId,
      amount,
    });
    // Log refund — fetch balance after refund
    const { data: profile } = await client
      .from("profiles")
      .select("credits_balance")
      .eq("id", userId)
      .single();
    if (profile) {
      logCreditChange(userId, amount, profile.credits_balance, "refund");
    }
  } catch (e) {
    logger.error("[CreditService] refund failed:", e);
  }
}

/**
 * Admin credit adjustment — atomic add/subtract for admin panel.
 * Uses `admin_adjust_credits` RPC with fallback to `increment_credits`.
 *
 * @param userId  Target user.
 * @param delta   Positive to grant, negative to revoke.
 */
export async function adminAdjustCredits(
  userId: string,
  delta: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = createServiceClient();

    const { error: rpcError } = await client.rpc("admin_adjust_credits", {
      target_user_id: userId,
      delta,
    });

    if (!rpcError) {
      const { data: profile } = await client
        .from("profiles")
        .select("credits_balance")
        .eq("id", userId)
        .single();
      if (profile) {
        logCreditChange(
          userId,
          delta,
          profile.credits_balance,
          delta > 0 ? "admin_grant" : "admin_revoke",
          "admin",
        );
      }
      return { success: true };
    }

    // Fallback RPC
    const { error: fallbackError } = await client.rpc("increment_credits", {
      row_id: userId,
      amount: delta,
    });

    if (!fallbackError) {
      const { data: fbProfile } = await client
        .from("profiles")
        .select("credits_balance")
        .eq("id", userId)
        .single();
      if (fbProfile) {
        logCreditChange(
          userId,
          delta,
          fbProfile.credits_balance,
          delta > 0 ? "admin_grant" : "admin_revoke",
          "admin",
        );
      }
      return { success: true };
    }

    logger.error("[CreditService] adminAdjustCredits failed:", fallbackError);
    return { success: false, error: "Failed to adjust credits" };
  } catch (e) {
    logger.error("[CreditService] adminAdjustCredits error:", e);
    return { success: false, error: "Internal error adjusting credits" };
  }
}

// ---------------------------------------------------------------------------
// Legacy fallback (rolling 24h reset + non-atomic decrement)
// ---------------------------------------------------------------------------
//
// Used only if the primary `refresh_and_decrement_credits` RPC is missing.
// Applies the same rolling-24h semantics as the RPC in a best-effort
// two-step fashion (no row lock). Prod should always use the RPC.

async function legacyCheckAndDecrement(
  userId: string,
  tier: string,
  queryClient: SupabaseClient,
  amount: number,
): Promise<CreditCheckResult> {
  if (tier === "free") {
    const { data: siteSettings } = await queryClient
      .from("site_settings")
      .select("daily_free_limit")
      .single();

    const dailyLimit = siteSettings?.daily_free_limit ?? 2;

    const { data: refreshData } = await queryClient
      .from("profiles")
      .select("last_prompt_at, credits_balance")
      .eq("id", userId)
      .single();

    const lastPrompt = refreshData?.last_prompt_at ? new Date(refreshData.last_prompt_at) : null;
    const now = new Date();
    const msSinceLast = lastPrompt ? now.getTime() - lastPrompt.getTime() : Infinity;
    const shouldReset = msSinceLast >= 24 * 60 * 60 * 1000;

    if (shouldReset) {
      await queryClient
        .from("profiles")
        .update({
          credits_balance: dailyLimit,
          credits_refreshed_at: now.toISOString(),
        })
        .eq("id", userId);
    }
  }

  const { data: fallbackRes, error: fallbackErr } = await queryClient.rpc(
    "check_and_decrement_credits",
    {
      target_user_id: userId,
      amount_to_spend: amount,
    },
  );

  if (fallbackErr || !fallbackRes || !fallbackRes.success) {
    return {
      allowed: false,
      remaining: fallbackRes?.current_balance ?? 0,
      error: fallbackRes?.error || "Insufficient credits or profile not found",
    };
  }

  // Update last_prompt_at after successful decrement
  if (tier === "free") {
    await queryClient
      .from("profiles")
      .update({ last_prompt_at: new Date().toISOString() })
      .eq("id", userId);
  }

  return {
    allowed: true,
    remaining: fallbackRes.current_balance ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Timer helpers
// ---------------------------------------------------------------------------

/**
 * When will the user's rolling quota refill? Returns null if the user has
 * fresh quota (no timer needed) or is on pro/admin tier.
 */
export async function getRefreshAt(userId: string): Promise<Date | null> {
  const client = createServiceClient();
  const { data, error } = await client
    .from("profiles")
    .select("last_prompt_at, plan_tier")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  if (data.plan_tier !== "free") return null;
  if (!data.last_prompt_at) return null;

  const last = new Date(data.last_prompt_at).getTime();
  const refreshAt = last + 24 * 60 * 60 * 1000;
  if (refreshAt <= Date.now()) return null;
  return new Date(refreshAt);
}
