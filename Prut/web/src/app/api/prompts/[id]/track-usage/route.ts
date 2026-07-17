import { NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@/lib/api-middleware";

const ParamsSchema = z.object({ id: z.string().uuid() });
const BodySchema = z.object({
  source: z.enum(["library", "graph", "search", "chain"]),
  session_id: z.string().uuid().optional(),
});

/**
 * POST /api/prompts/[id]/track-usage — record a personal-library usage event.
 * Auth + rate-limit (usageEvents bucket) owned by withUser; the route's dynamic
 * `{ id }` arrives as the third handler argument.
 */
export const POST = withUser<{ params: Promise<{ id: string }> }>(
  async (request, ctx, routeContext) => {
    const params = await routeContext.params;
    const idParse = ParamsSchema.safeParse(params);
    if (!idParse.success) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    const parse = BodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parse.success) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }

    // Verify the prompt belongs to this user before recording usage
    // (prevents cross-user graph poisoning).
    const { data: owned } = await ctx.db
      .from("personal_library")
      .select("id")
      .eq("id", idParse.data.id)
      .eq("user_id", ctx.user!.id)
      .maybeSingle();
    if (!owned) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const { error } = await ctx.db.from("personal_library_usage_events").insert({
      user_id: ctx.user!.id,
      prompt_id: idParse.data.id,
      source: parse.data.source,
      session_id: parse.data.session_id ?? null,
    });

    if (error) {
      return NextResponse.json({ error: "insert failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  },
  { rateLimit: "usageEvents" },
);
