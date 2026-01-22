import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const EventSchema = z.object({
  prompt_key: z.string().min(1),
  event_type: z.enum(["copy", "save", "refine"]),
  prompt_length: z.number().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const payload = EventSchema.parse(json);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("prompt_usage_events").insert({
      prompt_key: payload.prompt_key,
      event_type: payload.event_type,
      prompt_length: payload.prompt_length ?? null,
      user_id: user?.id ?? null,
    });

    if (error) {
      console.warn("Failed to store prompt usage event", error);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 200 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (!key) {
    return new Response(JSON.stringify({ error: "Missing key" }), { status: 400 });
  }

  try {
    const supabase = await createClient();
    const base = () =>
      supabase.from("prompt_usage_events").select("id", { count: "exact", head: true });

    const [
      { count: copies, error: copyError },
      { count: saves, error: saveError },
      { count: refinements, error: refineError },
    ] = await Promise.all([
      base().eq("prompt_key", key).eq("event_type", "copy"),
      base().eq("prompt_key", key).eq("event_type", "save"),
      base().eq("prompt_key", key).eq("event_type", "refine"),
    ]);

    if (copyError || saveError || refineError) {
      console.warn("Failed to fetch usage counts", copyError || saveError || refineError);
      return new Response(JSON.stringify({ copies: 0, saves: 0, refinements: 0 }), { status: 200 });
    }

    return new Response(
      JSON.stringify({
        copies: copies ?? 0,
        saves: saves ?? 0,
        refinements: refinements ?? 0,
      }),
      { status: 200 }
    );
  } catch {
    return new Response(JSON.stringify({ copies: 0, saves: 0, refinements: 0 }), { status: 200 });
  }
}
