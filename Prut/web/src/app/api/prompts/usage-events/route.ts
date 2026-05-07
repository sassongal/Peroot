import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ events: [] }, { status: 401 });
  }
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("personal_library_usage_events")
    .select("id, user_id, prompt_id, used_at, session_id, source")
    .eq("user_id", user.id)
    .gte("used_at", since)
    .order("used_at", { ascending: false })
    .limit(2000);
  if (error) return NextResponse.json({ events: [] }, { status: 500 });
  return NextResponse.json({ events: data ?? [] });
}
