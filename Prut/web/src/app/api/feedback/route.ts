import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { withUser } from "@/lib/api-middleware";
import { createServiceClient } from "@/lib/supabase/service";

/** Why a result was rejected. Mirrors the CHECK constraint on the column. */
export const FEEDBACK_REASONS = [
  "too_short",
  "too_generic",
  "wrong_language",
  "missed_intent",
] as const;

const Schema = z.object({
  rating: z.union([z.literal(1), z.literal(-1)]),
  input_text: z.string().max(10_000).optional(),
  enhanced_text: z.string().max(50_000).optional(),
  capability_mode: z.string().max(100).optional(),
  reason: z.enum(FEEDBACK_REASONS).optional(),
});

/**
 * POST /api/feedback — a thumbs up/down on an enhancement (web + extension).
 *
 * Guests may answer too (master plan 3.9). They are the people most likely to
 * bounce, and the product had collected three pieces of feedback ever while
 * this endpoint was authenticated-only.
 *
 * Guest rows are written with the service client on purpose: prompt_feedback's
 * INSERT policy is `auth.uid() = user_id`, which denies anonymous writes, and
 * that policy is left alone rather than opened up. The write path stays here,
 * behind the per-IP rate limit, instead of becoming an open table.
 */
export const POST = withUser(
  async (req, ctx) => {
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "קלט לא תקין", code: "invalid_input" }, { status: 422 });
    }

    const { rating, input_text, enhanced_text, capability_mode, reason } = parsed.data;
    const row = {
      user_id: ctx.user?.id ?? null,
      rating,
      input_text: input_text?.slice(0, 10_000),
      enhanced_text: enhanced_text?.slice(0, 50_000),
      capability_mode,
      // A reason only means something alongside a rejection.
      reason: rating === -1 ? (reason ?? null) : null,
    };

    const client = ctx.user ? ctx.db : createServiceClient();
    const { error } = await client.from("prompt_feedback").insert(row);

    if (error) {
      logger.error("[feedback] insert failed:", error);
      return NextResponse.json(
        { error: "שמירת המשוב נכשלה", code: "save_failed" },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true });
  },
  // Rate limited rather than "none", because it now accepts unauthenticated
  // callers and writes a row per request.
  { rateLimit: "free", allowGuest: true },
);
