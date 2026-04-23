import { type NextRequest, NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin/admin-security";

export async function GET(req: NextRequest) {
  const { error, supabase } = await validateAdminSession();
  if (error || !supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const search = req.nextUrl.searchParams.get("search") ?? "";
  const page = Math.max(0, parseInt(req.nextUrl.searchParams.get("page") ?? "0"));
  const pageSize = 20;

  const [promptsRes, categoriesRes] = await Promise.all([
    supabase.from("public_library_prompts").select("id", { count: "exact", head: true }),
    supabase.from("library_categories").select("id", { count: "exact", head: true }),
  ]);

  // Paginated list with optional search
  let listQuery = supabase
    .from("public_library_prompts")
    .select("id, title, category_id, capability_mode, is_active, created_at, use_case")
    .order("created_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);

  if (search.trim()) {
    listQuery = listQuery.ilike("title", `%${search.trim()}%`);
  }

  const { data: prompts } = await listQuery;

  return NextResponse.json({
    totalDocs: promptsRes.count ?? 0,
    categoryCount: categoriesRes.count ?? 0,
    prompts: prompts ?? [],
    page,
    pageSize,
  });
}
