import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";

export const GET = withAdmin(async (_req, supabase) => {
  const [positiveResult, negativeResult] = await Promise.all([
    supabase.from("prompt_feedback").select("*", { count: "exact", head: true }).eq("rating", 1),
    supabase.from("prompt_feedback").select("*", { count: "exact", head: true }).eq("rating", -1),
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
});
