import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { withUser } from "@/lib/api-middleware";

/**
 * GET /api/user-variables?keys=brand_name,target_audience
 * Returns saved variable values for the authenticated user (web + extension).
 * Auth + client scoping owned by withUser.
 */
export const GET = withUser(
  async (req, ctx) => {
    const keysParam = req.nextUrl.searchParams.get("keys");
    let query = ctx.db
      .from("user_variables")
      .select("variable_key, variable_value")
      .eq("user_id", ctx.user!.id)
      .order("use_count", { ascending: false })
      .limit(100);

    if (keysParam) {
      const keys = keysParam
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      if (keys.length > 0) {
        query = query.in("variable_key", keys);
      }
    }

    const { data, error } = await query;
    if (error) {
      logger.error("[user-variables] GET error:", error);
      return NextResponse.json(
        { error: "טעינת המשתנים נכשלה", code: "load_failed" },
        { status: 500 },
      );
    }

    const variables: Record<string, string> = {};
    for (const row of data || []) {
      variables[row.variable_key] = row.variable_value;
    }
    return NextResponse.json({ variables });
  },
  { rateLimit: "none" },
);

/**
 * POST /api/user-variables
 * Body: { variables: { brand_name: "Peroot", ... } } — upserts for the user.
 */
export const POST = withUser(
  async (req, ctx) => {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "גוף הבקשה אינו JSON תקין", code: "invalid_json" },
        { status: 400 },
      );
    }
    const { variables } = body as { variables?: Record<string, string> };

    if (!variables || typeof variables !== "object") {
      return NextResponse.json(
        { error: "Invalid body: expected { variables: { key: value } }" },
        { status: 400 },
      );
    }

    // Validate and build rows
    const entries = Object.entries(variables).filter(
      ([key, value]) =>
        key &&
        typeof value === "string" &&
        value.trim() &&
        key.length <= 100 &&
        value.length <= 500,
    );

    if (entries.length === 0) {
      return NextResponse.json({ success: true }); // nothing to save
    }
    if (entries.length > 50) {
      return NextResponse.json({ error: "Too many variables (max 50)" }, { status: 400 });
    }

    const rows = entries.map(([key, value]) => ({
      user_id: ctx.user!.id,
      variable_key: key.trim(),
      variable_value: value.trim(),
      last_used_at: new Date().toISOString(),
    }));

    const { error } = await ctx.db
      .from("user_variables")
      .upsert(rows, { onConflict: "user_id,variable_key" });

    if (error) {
      logger.error("[user-variables] POST error:", error);
      return NextResponse.json(
        { error: "שמירת המשתנים נכשלה", code: "save_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  },
  { rateLimit: "none" },
);
