import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const Schema = z.object({
  rating: z.union([z.literal(1), z.literal(-1)]),
  input_text: z.string().max(10_000).optional(),
  enhanced_text: z.string().max(50_000).optional(),
  capability_mode: z.string().max(100).optional(),
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 });

    const { rating, input_text, enhanced_text, capability_mode } = parsed.data;
    const { error } = await supabase.from("prompt_feedback").insert({
      user_id: user.id,
      rating,
      input_text: input_text?.slice(0, 10_000),
      enhanced_text: enhanced_text?.slice(0, 50_000),
      capability_mode,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
