import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";



const UpdateSchema = z.object({
  id: z.string().min(1),
  delta: z.number().int().min(1).max(5).default(1),
});

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("prompt_popularity")
    .select("prompt_id, count");

  if (error) {
    logger.error("Failed to load popularity:", error);
    return NextResponse.json({ error: "Failed to load popularity" }, { status: 500 });
  }

  const popularity = Object.fromEntries(
    (data ?? []).map((row) => [row.prompt_id, row.count])
  );

  return NextResponse.json({ popularity }, {
    headers: {
      'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
    }
  });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const json = await req.json();
    const { id, delta } = UpdateSchema.parse(json);

    const { data, error } = await supabase.rpc("increment_prompt_popularity", {
      prompt_id: id,
      delta,
    });

    if (error) {
      logger.error("Failed to update popularity:", error);
      return NextResponse.json({ error: "Failed to update popularity" }, { status: 500 });
    }

    return NextResponse.json({ id, count: data ?? null });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data", details: error.issues }, { status: 400 });
    }
    logger.error("Popularity API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
