import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { z } from "zod";

const Schema = z.object({
  rating: z.union([z.literal(1), z.literal(-1)]),
  input_text: z.string().max(10_000).optional(),
  enhanced_text: z.string().max(50_000).optional(),
  capability_mode: z.string().max(100).optional(),
});

export async function POST(req: Request) {
  try {
    // Support Bearer token auth for Chrome extension, fall back to cookie auth
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    let userId: string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let insertClient: any;

    if (bearerToken) {
      const svc = createServiceClient();
      const {
        data: { user },
      } = await svc.auth.getUser(bearerToken);
      userId = user?.id;
      insertClient = svc;
    } else {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id;
      insertClient = supabase;
    }

    if (!userId) return NextResponse.json({ error: "נדרשת התחברות", code: "auth_required" }, { status: 401 });

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "קלט לא תקין", code: "invalid_input" }, { status: 422 });

    const { rating, input_text, enhanced_text, capability_mode } = parsed.data;
    const { error } = await insertClient.from("prompt_feedback").insert({
      user_id: userId,
      rating,
      input_text: input_text?.slice(0, 10_000),
      enhanced_text: enhanced_text?.slice(0, 50_000),
      capability_mode,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת פנימית", code: "internal_error" }, { status: 500 });
  }
}
