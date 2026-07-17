import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { withUser } from "@/lib/api-middleware";

const UpdateSchema = z.object({
  id: z.string().min(1),
  delta: z.number().int().min(1).max(5).default(1),
});

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase.from("prompt_popularity").select("prompt_id, count");

  if (error) {
    logger.error("Failed to load popularity:", error);
    return NextResponse.json(
      { error: "טעינת הנתונים נכשלה", code: "load_failed" },
      { status: 500 },
    );
  }

  const popularity = Object.fromEntries((data ?? []).map((row) => [row.prompt_id, row.count]));

  return NextResponse.json(
    { popularity },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}

// POST is authenticated (increment a prompt's popularity). Auth owned by withUser.
export const POST = withUser(
  async (req, ctx) => {
    try {
      const json = await req.json();
      const { id, delta } = UpdateSchema.parse(json);

      const { data, error } = await ctx.db.rpc("increment_prompt_popularity", {
        prompt_id: id,
        delta,
      });

      if (error) {
        logger.error("Failed to update popularity:", error);
        return NextResponse.json(
          { error: "עדכון הנתונים נכשל", code: "update_failed" },
          { status: 500 },
        );
      }

      return NextResponse.json({ id, count: data ?? null });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "נתוני הבקשה אינם תקינים", code: "invalid_request", details: error.issues },
          { status: 400 },
        );
      }
      logger.error("Popularity API error:", error);
      return NextResponse.json(
        { error: "שגיאת שרת פנימית", code: "internal_error" },
        { status: 500 },
      );
    }
  },
  { rateLimit: "none" },
);
