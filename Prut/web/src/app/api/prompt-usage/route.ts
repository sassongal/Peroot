import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { withUser } from "@/lib/api-middleware";

const EventSchema = z.object({
  prompt_key: z.string().min(1),
  event_type: z.enum(["copy", "save", "refine", "enhance"]),
  prompt_length: z.number().optional(),
});

/**
 * POST /api/prompt-usage — record a usage event (authenticated). Auth owned by
 * withUser; keeps the original IP-keyed guest-bucket rate limit via rateLimitKey.
 */
export const POST = withUser(
  async (req, ctx) => {
    const payload = EventSchema.parse(await req.json());

    const { error } = await ctx.db.from("prompt_usage_events").insert({
      prompt_id: payload.prompt_key, // Map key to id column
      event_type: payload.event_type,
      prompt_length: payload.prompt_length ?? null,
      user_id: ctx.user!.id,
    });

    if (error) {
      logger.warn("Failed to store prompt usage event", error);
    }

    return NextResponse.json({ ok: true });
  },
  { rateLimit: "guest", rateLimitKey: ({ ip }) => `prompt-usage:${ip ?? "unknown"}` },
);

// GET stays public (no auth) — aggregate counts for a prompt key.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (!key) {
    return new Response(JSON.stringify({ error: "חסר מפתח", code: "missing_key" }), {
      status: 400,
    });
  }

  try {
    const supabase = await createClient();

    // Check if RPC exists, if not use count(). RPC might be using wrong column name internally too.
    // If RPC failed earlier with 'prompt_key' mismatch, it means RPC body is wrong.
    // I'll assume RPC was written for 'prompt_key'.
    // Safe bet: Use direct Query instead of RPC for now if I can't see RPC code?
    // I saw RPC name exists.
    // Let's rely on direct count queries for robustness and remove dependency on potentially broken RPC.

    // 3 parallel HEAD count queries (no data transferred, only counts)
    const [copiesRes, savesRes, refinementsRes] = await Promise.all([
      supabase
        .from("prompt_usage_events")
        .select("*", { count: "exact", head: true })
        .eq("prompt_id", key)
        .eq("event_type", "copy"),
      supabase
        .from("prompt_usage_events")
        .select("*", { count: "exact", head: true })
        .eq("prompt_id", key)
        .eq("event_type", "save"),
      supabase
        .from("prompt_usage_events")
        .select("*", { count: "exact", head: true })
        .eq("prompt_id", key)
        .in("event_type", ["refine", "enhance"]),
    ]);

    return new Response(
      JSON.stringify({
        copies: copiesRes.count ?? 0,
        saves: savesRes.count ?? 0,
        refinements: refinementsRes.count ?? 0,
      }),
      { status: 200 },
    );
  } catch {
    return new Response(JSON.stringify({ copies: 0, saves: 0, refinements: 0 }), { status: 200 });
  }
}
