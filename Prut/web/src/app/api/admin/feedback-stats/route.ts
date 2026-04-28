import { NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin/admin-security";

export async function GET() {
  const { error, supabase } = await validateAdminSession();
  if (error || !supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Use head-count queries per rating bucket instead of fetching all rows
  const [positiveResult, negativeResult] = await Promise.all([
    supabase
      .from("prompt_feedback")
      .select("*", { count: "exact", head: true })
      .eq("rating", 1),
    supabase
      .from("prompt_feedback")
      .select("*", { count: "exact", head: true })
      .eq("rating", -1),
  ]);

  if (positiveResult.error) {
    return NextResponse.json({ error: positiveResult.error.message }, { status: 500 });
  }
  if (negativeResult.error) {
    return NextResponse.json({ error: negativeResult.error.message }, { status: 500 });
  }

  const positive = positiveResult.count ?? 0;
  const negative = negativeResult.count ?? 0;
  const total = positive + negative;

  return NextResponse.json({
    total,
    positive,
    negative,
    positiveRate: total > 0 ? Math.round((positive / total) * 100) : 0,
  });
}
