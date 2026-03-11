import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete user data from all tables
  await Promise.all([
    supabase.from("personal_library").delete().eq("user_id", user.id),
    supabase.from("prompt_favorites").delete().eq("user_id", user.id),
    supabase.from("activity_logs").delete().eq("user_id", user.id),
    supabase.from("user_achievements").delete().eq("user_id", user.id),
    supabase.from("user_roles").delete().eq("user_id", user.id),
    supabase.from("profiles").delete().eq("id", user.id),
  ]);

  // Delete auth user using admin client (service role bypasses RLS)
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
}
