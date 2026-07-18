import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { withUser } from "@/lib/api-middleware";

const MAX_FACTS = 100;

// user_memory_facts is read/written via the service-role client even under
// cookie auth (no user-facing RLS policies), so every handler forces it and
// scopes by ctx.user.id. Auth owned by withUser.

export const GET = withUser(
  async (_req, ctx) => {
    const { data, error } = await ctx.db
      .from("user_memory_facts")
      .select("id, fact, category, source, confidence, created_at, updated_at")
      .eq("user_id", ctx.user!.id)
      .order("updated_at", { ascending: false })
      .limit(MAX_FACTS);

    if (error) {
      logger.error("[user/memory] query failed:", error);
      return NextResponse.json({ error: "פעולה נכשלה", code: "operation_failed" }, { status: 500 });
    }
    return NextResponse.json({ facts: data ?? [] });
  },
  { rateLimit: "none", forceServiceClient: true },
);

const AddSchema = z.object({
  fact: z.string().min(3).max(300),
  category: z
    .enum(["professional", "personal", "preference", "project", "language", "general"])
    .default("general"),
});

export const POST = withUser(
  async (req, ctx) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "גוף הבקשה אינו JSON תקין", code: "invalid_json" },
        { status: 400 },
      );
    }

    const parsed = AddSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "קלט לא תקין", code: "invalid_input" }, { status: 400 });
    }

    const { count } = await ctx.db
      .from("user_memory_facts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", ctx.user!.id);

    if ((count ?? 0) >= MAX_FACTS) {
      return NextResponse.json(
        { error: "הגעת למגבלת הזיכרון", code: "limit_reached" },
        { status: 400 },
      );
    }

    const { data, error } = await ctx.db
      .from("user_memory_facts")
      .insert({
        user_id: ctx.user!.id,
        fact: parsed.data.fact.trim(),
        category: parsed.data.category,
        source: "manual",
        confidence: 1.0,
      })
      .select("id, fact, category, source, confidence, created_at, updated_at")
      .single();

    if (error) {
      logger.error("[user/memory] query failed:", error);
      return NextResponse.json({ error: "פעולה נכשלה", code: "operation_failed" }, { status: 500 });
    }
    return NextResponse.json({ fact: data });
  },
  { rateLimit: "none", forceServiceClient: true },
);

const DeleteSchema = z.object({
  id: z.string().uuid(),
});

export const DELETE = withUser(
  async (req, ctx) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "גוף הבקשה אינו JSON תקין", code: "invalid_json" },
        { status: 400 },
      );
    }

    const parsed = DeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "קלט לא תקין", code: "invalid_input" }, { status: 400 });
    }

    const { error } = await ctx.db
      .from("user_memory_facts")
      .delete()
      .eq("id", parsed.data.id)
      .eq("user_id", ctx.user!.id);

    if (error) {
      logger.error("[user/memory] query failed:", error);
      return NextResponse.json({ error: "פעולה נכשלה", code: "operation_failed" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  },
  { rateLimit: "none", forceServiceClient: true },
);
