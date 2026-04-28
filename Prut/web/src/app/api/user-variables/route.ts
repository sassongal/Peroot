import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

/**
 * GET /api/user-variables?keys=brand_name,target_audience
 * Returns saved variable values for the authenticated user.
 * Optional `keys` query param filters to specific variable keys.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    const { data: { user } } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "נדרשת התחברות", code: "auth_required" }, { status: 401 });
    }

    const client = bearerToken ? createServiceClient() : supabase;

    const keysParam = req.nextUrl.searchParams.get("keys");
    let query = client
      .from("user_variables")
      .select("variable_key, variable_value")
      .eq("user_id", user.id)
      .order("use_count", { ascending: false })
      .limit(100);

    if (keysParam) {
      const keys = keysParam.split(",").map(k => k.trim()).filter(Boolean);
      if (keys.length > 0) {
        query = query.in("variable_key", keys);
      }
    }

    const { data, error } = await query;

    if (error) {
      logger.error("[user-variables] GET error:", error);
      return NextResponse.json({ error: "טעינת המשתנים נכשלה", code: "load_failed" }, { status: 500 });
    }

    const variables: Record<string, string> = {};
    for (const row of data || []) {
      variables[row.variable_key] = row.variable_value;
    }

    return NextResponse.json({ variables });
  } catch (error) {
    logger.error("[user-variables] GET error:", error);
    return NextResponse.json({ error: "שגיאת שרת פנימית", code: "internal_error" }, { status: 500 });
  }
}

/**
 * POST /api/user-variables
 * Body: { variables: { brand_name: "Peroot", target_audience: "..." } }
 * Upserts variable values for the authenticated user.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    const { data: { user } } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "נדרשת התחברות", code: "auth_required" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "גוף הבקשה אינו JSON תקין", code: "invalid_json" }, { status: 400 });
    }
    const { variables } = body as { variables?: Record<string, string> };

    if (!variables || typeof variables !== "object") {
      return NextResponse.json({ error: "Invalid body: expected { variables: { key: value } }" }, { status: 400 });
    }

    // Validate and build rows
    const entries = Object.entries(variables).filter(
      ([key, value]) => key && typeof value === "string" && value.trim() && key.length <= 100 && value.length <= 500
    );

    if (entries.length === 0) {
      return NextResponse.json({ success: true }); // nothing to save
    }

    if (entries.length > 50) {
      return NextResponse.json({ error: "Too many variables (max 50)" }, { status: 400 });
    }

    const client = bearerToken ? createServiceClient() : supabase;

    const rows = entries.map(([key, value]) => ({
      user_id: user.id,
      variable_key: key.trim(),
      variable_value: value.trim(),
      last_used_at: new Date().toISOString(),
    }));

    const { error } = await client
      .from("user_variables")
      .upsert(rows, { onConflict: "user_id,variable_key" });

    if (error) {
      logger.error("[user-variables] POST error:", error);
      return NextResponse.json({ error: "שמירת המשתנים נכשלה", code: "save_failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[user-variables] POST error:", error);
    return NextResponse.json({ error: "שגיאת שרת פנימית", code: "internal_error" }, { status: 500 });
  }
}
