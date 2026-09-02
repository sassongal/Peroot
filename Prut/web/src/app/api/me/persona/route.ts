import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { withUser } from "@/lib/api-middleware";
import { enqueueJob } from "@/lib/jobs/queue";
import { memoryFlags } from "@/lib/memory/injection-flags";

/**
 * The style persona, from the user's side (master plan 3.3).
 *
 * `user_style_personality` has been shaping every enhancement for months
 * through the `[USER_PERSONALITY_TRAITS]` block, and the user had no way to
 * see what it said about them, correct it, or refuse it. The only switch was
 * a global env var. This route is that missing control panel.
 *
 * All three verbs run under RLS with the caller's own client. The persona is
 * about as personal as data gets here, so nothing on this path touches the
 * service client.
 */

const PatchSchema = z
  .object({
    injection_enabled: z.boolean().optional(),
    // Matches the analyzer's own cap (StylePersonaSchema.personality_brief).
    personality_brief: z.string().max(1000).optional(),
  })
  .refine((v) => v.injection_enabled !== undefined || v.personality_brief !== undefined, {
    message: "empty patch",
  });

const SELECT =
  "style_tokens, personality_brief, preferred_format, last_analyzed_at, injection_enabled";

export const GET = withUser(
  async (_req, ctx) => {
    const { data, error } = await ctx
      .db!.from("user_style_personality")
      .select(SELECT)
      .eq("user_id", ctx.user!.id)
      .maybeSingle();

    if (error) {
      logger.error("[persona] read failed:", error);
      return NextResponse.json(
        { error: "טעינת הסגנון נכשלה", code: "load_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      persona: data ?? null,
      // A user who turned the platform-wide switch off should not be told
      // their persona is live. The row's own flag cannot express that.
      injection_available: memoryFlags.personalityEnabled,
    });
  },
  { rateLimit: "me" },
);

export const PATCH = withUser(
  async (req, ctx) => {
    const parsed = PatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "קלט לא תקין", code: "invalid_input" }, { status: 422 });
    }

    // Upsert rather than update: a user with fewer than three saved prompts
    // has never been analyzed and therefore has no row, and refusing to record
    // their opt-out until the analyzer gets around to them is backwards.
    const { data, error } = await ctx
      .db!.from("user_style_personality")
      .upsert({ user_id: ctx.user!.id, ...parsed.data }, { onConflict: "user_id" })
      .select(SELECT)
      .maybeSingle();

    if (error) {
      logger.error("[persona] update failed:", error);
      return NextResponse.json(
        { error: "שמירת הסגנון נכשלה", code: "save_failed" },
        { status: 500 },
      );
    }
    return NextResponse.json({ persona: data });
  },
  { rateLimit: "me" },
);

/**
 * Queue a fresh analysis. The work itself runs in the hourly jobs worker, and
 * `enqueueJob` already collapses a duplicate pending job per user, so the
 * honest answer to the caller is "queued", never "done".
 */
export const POST = withUser(
  async (_req, ctx) => {
    await enqueueJob("style_analysis", { userId: ctx.user!.id });
    return NextResponse.json({ queued: true });
  },
  { rateLimit: "personaRefresh" },
);
