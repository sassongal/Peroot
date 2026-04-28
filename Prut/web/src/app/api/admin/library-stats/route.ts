import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";

export const GET = withAdmin(async (req: NextRequest, supabase) => {
  const search = req.nextUrl.searchParams.get("search") ?? "";
  const page = Math.max(0, parseInt(req.nextUrl.searchParams.get("page") ?? "0"));
  const pageSize = 20;

  const [promptsRes, categoriesRes] = await Promise.all([
    supabase.from("public_library_prompts").select("id", { count: "exact", head: true }),
    supabase.from("library_categories").select("id", { count: "exact", head: true }),
  ]);

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
});
