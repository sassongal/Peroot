import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "slug, title, excerpt, category, read_time, published_at, thumbnail_url, tags"
    )
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
