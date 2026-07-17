import { NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@/lib/api-middleware";

const Schema = z.object({
  rating: z.union([z.literal(1), z.literal(-1)]),
  input_text: z.string().max(10_000).optional(),
  enhanced_text: z.string().max(50_000).optional(),
  capability_mode: z.string().max(100).optional(),
});

/**
 * POST /api/feedback — record a thumbs up/down on an enhancement (web + extension).
 * Auth + client scoping owned by withUser.
 */
export const POST = withUser(
  async (req, ctx) => {
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "קלט לא תקין", code: "invalid_input" }, { status: 422 });
    }

    const { rating, input_text, enhanced_text, capability_mode } = parsed.data;
    const { error } = await ctx.db.from("prompt_feedback").insert({
      user_id: ctx.user!.id,
      rating,
      input_text: input_text?.slice(0, 10_000),
      enhanced_text: enhanced_text?.slice(0, 50_000),
      capability_mode,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  },
  { rateLimit: "none" },
);
