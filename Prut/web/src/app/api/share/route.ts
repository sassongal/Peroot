import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { withUser } from "@/lib/api-middleware";

const ShareSchema = z.object({
  prompt: z.string().min(1).max(50000),
  original_input: z.string().max(50000).optional(),
  category: z.string().max(100).default("כללי"),
  capability_mode: z.string().max(50).default("STANDARD"),
});

/**
 * POST /api/share — publish a prompt to a shareable link. Auth + rate-limit
 * (share bucket) owned by withUser.
 */
export const POST = withUser(
  async (request, ctx) => {
    const body = await request.json();
    const parseResult = ShareSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { prompt, original_input, category, capability_mode } = parseResult.data;

    const { data, error } = await ctx.db
      .from("shared_prompts")
      .insert({
        prompt: prompt.trim(),
        original_input: original_input?.trim() || null,
        category: category || "General",
        capability_mode: capability_mode || "STANDARD",
        user_id: ctx.user!.id,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      logger.error("[Share] Error:", error);
      return NextResponse.json({ error: "Failed to share prompt" }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  },
  { rateLimit: "share" },
);
