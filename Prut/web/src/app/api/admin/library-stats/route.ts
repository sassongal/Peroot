import { NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin/admin-security";

export async function GET() {
  const { error, supabase } = await validateAdminSession();
  if (error || !supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [promptsRes, categoriesRes] = await Promise.all([
    supabase.from("public_library_prompts").select("id", { count: "exact", head: true }),
    supabase.from("library_categories").select("id", { count: "exact", head: true }),
  ]);

  return NextResponse.json({
    totalDocs: promptsRes.count ?? 0,
    categoryCount: categoriesRes.count ?? 0,
  });
}
