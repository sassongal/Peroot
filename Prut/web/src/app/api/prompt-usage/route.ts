import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const EventSchema = z.object({
  prompt_key: z.string().min(1),
  event_type: z.enum(["copy", "save", "refine", "enhance"]),
  prompt_length: z.number().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const payload = EventSchema.parse(json);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("prompt_usage_events").insert({
      prompt_id: payload.prompt_key, // Map key to id column
      event_type: payload.event_type,
      prompt_length: payload.prompt_length ?? null,
      user_id: user?.id ?? null,
    });

    if (error) {
      console.warn("Failed to store prompt usage event", error);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    console.error(e);
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
    
    // Check if RPC exists, if not use count(). RPC might be using wrong column name internally too.
    // If RPC failed earlier with 'prompt_key' mismatch, it means RPC body is wrong.
    // I'll assume RPC was written for 'prompt_key'.
    // Safe bet: Use direct Query instead of RPC for now if I can't see RPC code?
    // I saw RPC name exists.
    // Let's rely on direct count queries for robustness and remove dependency on potentially broken RPC.
    
    const { count: copies } = await supabase.from('prompt_usage_events')
        .select('*', { count: 'exact', head: true })
        .eq('prompt_id', key)
        .eq('event_type', 'copy');
        
    const { count: saves } = await supabase.from('prompt_usage_events')
        .select('*', { count: 'exact', head: true })
        .eq('prompt_id', key)
        .eq('event_type', 'save');

    const { count: refinements } = await supabase.from('prompt_usage_events')
        .select('*', { count: 'exact', head: true })
        .eq('prompt_id', key)
        .in('event_type', ['refine', 'enhance']);

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
