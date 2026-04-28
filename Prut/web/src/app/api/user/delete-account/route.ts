import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/ratelimit";

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "נדרשת התחברות", code: "auth_required" }, { status: 401 });
  }

  // Rate limit: 5 attempts per hour (using guest tier)
  const rl = await checkRateLimit(`delete-account:${user.id}`, "guest");
  if (!rl.success) {
    return NextResponse.json({ error: "יותר מדי ניסיונות", code: "too_many_attempts" }, { status: 429 });
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
      return NextResponse.json(
        { error: "מחיקת כל הנתונים נכשלה. נסה שוב או פנה לתמיכה", code: "delete_failed" },
        { status: 500 }
      );
    }

    // Delete auth user using admin client
    const adminSupabase = createServiceClient(
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(
      user.id
    );

    if (deleteError) {
      logger.error("[delete-account] Failed to delete auth user:", deleteError);
      return NextResponse.json(
        { error: "מחיקת החשבון נכשלה", code: "delete_failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[delete-account] Unexpected error:", error);
    return NextResponse.json({ error: "שגיאת שרת פנימית", code: "internal_error" }, { status: 500 });
  }
}
