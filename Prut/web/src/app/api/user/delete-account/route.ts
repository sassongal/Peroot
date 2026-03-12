import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/ratelimit";

export async function DELETE(request: Request) {
  // CSRF origin check — only allow requests from the app's own domain
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const allowedOrigin = siteUrl.startsWith("http") ? new URL(siteUrl).origin : siteUrl;
  const rawOrigin = request.headers.get("origin") ?? request.headers.get("referer") ?? "";
  const requestOrigin = rawOrigin.startsWith("http") ? new URL(rawOrigin).origin : "";

  if (!requestOrigin || requestOrigin !== allowedOrigin) {
    logger.warn("[delete-account] CSRF origin mismatch:", { requestOrigin, allowedOrigin });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 5 attempts per hour (using guest tier)
  const rl = await checkRateLimit(`delete-account:${user.id}`, "guest");
  if (!rl.success) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  try {
    // Use allSettled to ensure partial failures don't block the entire operation
    const results = await Promise.allSettled([
      supabase.from("personal_library").delete().eq("user_id", user.id),
      supabase.from("prompt_favorites").delete().eq("user_id", user.id),
      supabase.from("activity_logs").delete().eq("user_id", user.id),
      supabase.from("user_achievements").delete().eq("user_id", user.id),
      supabase.from("user_roles").delete().eq("user_id", user.id),
      supabase.from("profiles").delete().eq("id", user.id),
    ]);

    const failures = results.filter((r) => r.status === "rejected");
    if (failures.length > 0) {
      logger.error("[delete-account] Partial data deletion failures:", failures);
    }

    // Delete auth user using admin client
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(
      user.id
    );

    if (deleteError) {
      logger.error("[delete-account] Failed to delete auth user:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete account" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[delete-account] Unexpected error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
