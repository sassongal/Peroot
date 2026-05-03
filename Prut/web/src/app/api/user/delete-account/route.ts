import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/ratelimit";
import { z } from "zod";

const DeleteSchema = z.object({
  confirmEmail: z.string().email(),
});

export async function DELETE(req: NextRequest) {
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
    return NextResponse.json(
      { error: "יותר מדי ניסיונות", code: "too_many_attempts" },
      { status: 429 },
    );
  }

  // Require email confirmation to prevent accidental deletion
  try {
    const body = await req.json();
    const parsed = DeleteSchema.safeParse(body);
    if (!parsed.success || parsed.data.confirmEmail.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: "אימות האימייל נכשל", code: "email_mismatch" },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "גוף הבקשה אינו תקין", code: "invalid_body" },
      { status: 400 },
    );
  }

  try {
    const svc = createServiceClient();
    // Use allSettled to ensure partial failures don't block the entire operation
    const results = await Promise.allSettled([
      svc.from("personal_library").delete().eq("user_id", user.id),
      svc.from("prompt_favorites").delete().eq("user_id", user.id),
      svc.from("activity_logs").delete().eq("user_id", user.id),
      svc.from("user_achievements").delete().eq("user_id", user.id),
      svc.from("user_roles").delete().eq("user_id", user.id),
      svc.from("history").delete().eq("user_id", user.id),
      svc.from("api_usage_logs").delete().eq("user_id", user.id),
      svc.from("credit_ledger").delete().eq("user_id", user.id),
      svc.from("referral_codes").delete().eq("user_id", user.id),
      svc.from("user_variables").delete().eq("user_id", user.id),
      svc.from("background_jobs").delete().eq("payload->>userId", user.id),
      svc.from("profiles").delete().eq("id", user.id),
    ]);

    const failures = results.filter((r) => r.status === "rejected");
    if (failures.length > 0) {
      logger.error("[delete-account] Partial data deletion failures:", failures);
      return NextResponse.json(
        { error: "מחיקת כל הנתונים נכשלה. נסה שוב או פנה לתמיכה", code: "delete_failed" },
        { status: 500 },
      );
    }

    // Delete auth user using admin client
    const adminSupabase = createServiceClient({
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
      logger.error("[delete-account] Failed to delete auth user:", deleteError);
      return NextResponse.json(
        { error: "מחיקת החשבון נכשלה", code: "delete_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[delete-account] Unexpected error:", error);
    return NextResponse.json(
      { error: "שגיאת שרת פנימית", code: "internal_error" },
      { status: 500 },
    );
  }
}
