import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

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

    const body = await req.json();
    const { prompt, enhanced_prompt, tone, category, title, source } = body;

    if (!prompt || !enhanced_prompt) {
      return NextResponse.json({ error: "Missing prompt or enhanced_prompt" }, { status: 400 });
    }

    // Use service role client to bypass RLS (Bearer token doesn't set auth.uid() context)
    const serviceClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Try with source column first, fall back without it
    const row: Record<string, string> = {
      user_id: user.id,
      prompt: prompt.substring(0, 10000),
      enhanced_prompt: enhanced_prompt.substring(0, 10000),
      tone: tone || "Professional",
      category: category || "General",
      title: title || prompt.substring(0, 60) + (prompt.length > 60 ? "..." : ""),
    };

    let { error } = await serviceClient.from("history").insert({ ...row, source: source || "extension" });

    // If source column doesn't exist yet, retry without it
    if (error?.message?.includes("source")) {
      ({ error } = await serviceClient.from("history").insert(row));
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
