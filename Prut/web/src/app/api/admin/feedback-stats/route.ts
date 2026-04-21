import { NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin/admin-security";

export async function GET() {
  const { error, supabase } = await validateAdminSession();
  if (error || !supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error: dbErr } = await supabase.from("prompt_feedback").select("rating");

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  const rows = data ?? [];
  const positive = rows.filter((r) => r.rating === 1).length;
  const negative = rows.filter((r) => r.rating === -1).length;
  const total = rows.length;

  return NextResponse.json({
    total,
    positive,
    negative,
    positiveRate: total > 0 ? Math.round((positive / total) * 100) : 0,
  });
}
