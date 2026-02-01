import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  id: z.string().min(1),
  delta: z.number().int().min(1).max(5).default(1),
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";
const isConfigured = Boolean(supabaseUrl && supabaseKey);

const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    })
  : null;

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("prompt_popularity")
    .select("prompt_id, count");

  if (error) {
    console.error("Failed to load popularity:", error);
    return NextResponse.json({ error: "Failed to load popularity" }, { status: 500 });
  }

  const popularity = Object.fromEntries(
    (data ?? []).map((row) => [row.prompt_id, row.count])
  );

  return NextResponse.json({ popularity }, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    }
  });
}

export async function POST(req: Request) {
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  try {
    const json = await req.json();
    const { id, delta } = UpdateSchema.parse(json);

    const { data, error } = await supabase.rpc("increment_prompt_popularity", {
      prompt_id: id,
      delta,
    });

    if (error) {
      console.error("Failed to update popularity:", error);
      return NextResponse.json({ error: "Failed to update popularity" }, { status: 500 });
    }

    return NextResponse.json({ id, count: data ?? null });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data", details: error.issues }, { status: 400 });
    }
    console.error("Popularity API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
