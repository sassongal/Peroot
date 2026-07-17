import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { withUser } from "@/lib/api-middleware";

const HistoryBodySchema = z.object({
  prompt: z.string().min(1).max(10000),
  enhanced_prompt: z.string().min(1).max(10000),
  tone: z.string().max(200).optional(),
  category: z.string().max(200).optional(),
  title: z.string().max(500).optional(),
  source: z.string().max(200).optional(),
});

/**
 * GET /api/history
 * Fetch the user's enhancement history (most recent first). Chrome extension
 * history tab. Auth + client scoping owned by withUser.
 */
export const GET = withUser(
  async (_req, ctx) => {
    // Deliberately resilient: the extension's history fetch never 500s — any
    // failure returns an empty list so the tab degrades gracefully.
    try {
      const { data, error } = await ctx.db
        .from("history")
        .select("id, prompt, enhanced_prompt, tone, category, title, source, created_at")
        .eq("user_id", ctx.user!.id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        logger.error("[history] GET error:", error);
        return NextResponse.json([], { status: 200 });
      }
      return NextResponse.json(data || []);
    } catch (error) {
      logger.error("[history] GET error:", error);
      return NextResponse.json([], { status: 200 });
    }
  },
  { rateLimit: "none" },
);

/**
 * POST /api/history
 * Save an enhancement to the user's history (web + extension).
 */
export const POST = withUser(
  async (req, ctx) => {
    const serviceClient = ctx.db;

    const body = await req.json();
    const parsed = HistoryBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "נתוני הבקשה אינם תקינים",
          code: "invalid_request",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }
    const { prompt, enhanced_prompt, tone, category, title, source } = parsed.data;

    const row: Record<string, string> = {
      user_id: ctx.user!.id,
      prompt: prompt.substring(0, 10000),
      enhanced_prompt: enhanced_prompt.substring(0, 10000),
      tone: tone || "Professional",
      category: category || "כללי",
      title: title || prompt.substring(0, 60) + (prompt.length > 60 ? "..." : ""),
    };

    // Try with source column first, fall back without it
    let { error } = await serviceClient
      .from("history")
      .insert({ ...row, source: source || "extension" });
    if (error?.message?.includes("source")) {
      ({ error } = await serviceClient.from("history").insert(row));
    }

    if (error) {
      logger.error("[history] DB error:", error);
      return NextResponse.json(
        { error: "שמירת ההיסטוריה נכשלה", code: "save_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  },
  { rateLimit: "history" },
);
