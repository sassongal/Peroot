import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { z } from "zod";

const ParamsSchema = z.object({ id: z.string().uuid() });
const BodySchema = z.object({
  source: z.enum(["library", "graph", "search", "chain"]),
  session_id: z.string().uuid().optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const idParse = ParamsSchema.safeParse(params);
  if (!idParse.success) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const parse = BodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parse.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(user.id, "usageEvents");
  if (!rateLimit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // Verify the prompt belongs to this user before recording usage (prevents cross-user graph poisoning).
  const { data: owned } = await supabase
    .from("personal_library")
    .select("id")
    .eq("id", idParse.data.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!owned) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { error } = await supabase.from("personal_library_usage_events").insert({
    user_id: user.id,
    prompt_id: idParse.data.id,
    source: parse.data.source,
    session_id: parse.data.session_id ?? null,
  });

  if (error) {
    return NextResponse.json({ error: "insert failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
