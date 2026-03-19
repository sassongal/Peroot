import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { checkRateLimit } from "@/lib/ratelimit";

const HistoryBodySchema = z.object({
  prompt: z.string().min(1).max(10000),
  enhanced_prompt: z.string().min(1).max(10000),
  tone: z.string().max(200).optional(),
  category: z.string().max(200).optional(),
  title: z.string().max(500).optional(),
  source: z.string().max(200).optional(),
});

/**
 * POST /api/history
 * Save an enhancement to the user's history.
 * Used by Chrome extension to sync history with website.
 * Supports both cookie auth (web) and Bearer token auth (extension).
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Support Bearer token auth for Chrome extension
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    const { data: { user } } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(user.id, 'history');
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
    }

    const body = await req.json();
    const parsed = HistoryBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request data", details: parsed.error.flatten() }, { status: 400 });
    }
    const { prompt, enhanced_prompt, tone, category, title, source } = parsed.data;

    // Only use service role client for Bearer token auth (extension) - cookie auth uses RLS
    const serviceClient = bearerToken
      ? createServiceClient()
      : supabase;

    // Try with source column first, fall back without it
    const row: Record<string, string> = {
      user_id: user.id,
      prompt: prompt.substring(0, 10000),
      enhanced_prompt: enhanced_prompt.substring(0, 10000),
      tone: tone || "Professional",
      category: category || "כללי",
      title: title || prompt.substring(0, 60) + (prompt.length > 60 ? "..." : ""),
    };

    let { error } = await serviceClient.from("history").insert({ ...row, source: source || "extension" });

    // If source column doesn't exist yet, retry without it
    if (error?.message?.includes("source")) {
      ({ error } = await serviceClient.from("history").insert(row));
    }

    if (error) {
      logger.error("[history] DB error:", error);
      return NextResponse.json({ error: "Failed to save history" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[history] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
