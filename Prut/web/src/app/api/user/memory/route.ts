import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { z } from "zod";

const MAX_FACTS = 100;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "נדרשת התחברות", code: "auth_required" }, { status: 401 });

  const sb = createServiceClient();
  const { data, error } = await sb
    .from("user_memory_facts")
    .select("id, fact, category, source, confidence, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(MAX_FACTS);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ facts: data ?? [] });
}

const AddSchema = z.object({
  fact: z.string().min(3).max(300),
  category: z
    .enum(["professional", "personal", "preference", "project", "language", "general"])
    .default("general"),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "נדרשת התחברות", code: "auth_required" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו JSON תקין", code: "invalid_json" }, { status: 400 });
  }

  const parsed = AddSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "קלט לא תקין", code: "invalid_input" }, { status: 400 });

  const sb = createServiceClient();

  const { count } = await sb
    .from("user_memory_facts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) >= MAX_FACTS) {
    return NextResponse.json({ error: "הגעת למגבלת הזיכרון", code: "limit_reached" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("user_memory_facts")
    .insert({
      user_id: user.id,
      fact: parsed.data.fact.trim(),
      category: parsed.data.category,
      source: "manual",
      confidence: 1.0,
    })
    .select("id, fact, category, source, confidence, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fact: data });
}

const DeleteSchema = z.object({
  id: z.string().uuid(),
});

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "נדרשת התחברות", code: "auth_required" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו JSON תקין", code: "invalid_json" }, { status: 400 });
  }

  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "קלט לא תקין", code: "invalid_input" }, { status: 400 });

  const sb = createServiceClient();
  const { error } = await sb
    .from("user_memory_facts")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
