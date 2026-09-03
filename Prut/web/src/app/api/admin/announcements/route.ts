import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin, withAdminWrite } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import { stripAiDashes } from "@/lib/text/dashes";

/**
 * Admin CRUD for the "מה חדש" notes (announcements table).
 *
 * GET    lists every note, live or not.
 * POST   creates one.
 * PATCH  updates one by id (partial).
 * DELETE removes one by id.
 *
 * Writes go through the admin's own session, so the table's RLS (admin
 * policy via is_admin()) is the authority, not this route.
 */

const noteSchema = z.object({
  title: z.string().trim().min(2).max(140),
  body: z.string().trim().max(400).default(""),
  href: z.string().trim().max(300).nullable().optional(),
  href_label: z.string().trim().max(40).nullable().optional(),
  starts_at: z.string().datetime({ offset: true }).optional(),
  ends_at: z.string().datetime({ offset: true }).nullable().optional(),
  audience: z.enum(["all", "guests", "users", "pro"]).default("all"),
  lang: z.enum(["he", "en", "ar", "ru"]).default("he"),
  priority: z.number().int().min(-100).max(100).default(0),
  is_active: z.boolean().default(true),
});

const patchSchema = noteSchema.partial().extend({ id: z.string().uuid() });

// Project law: nothing a reader sees carries an em or en dash.
function stripDashes<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = { ...row };
  for (const key of ["title", "body", "href_label"]) {
    if (typeof out[key] === "string") out[key] = stripAiDashes(out[key] as string);
  }
  return out as T;
}

export const GET = withAdmin(async (_req, supabase) => {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("starts_at", { ascending: false });
  if (error) {
    logger.error("[admin/announcements] list failed", error);
    return NextResponse.json({ error: "טעינת ההודעות נכשלה" }, { status: 500 });
  }
  return NextResponse.json({ announcements: data ?? [] });
});

export const POST = withAdminWrite(async (req, supabase, user) => {
  const parsed = noteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "נתונים לא תקינים", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { data, error } = await supabase
    .from("announcements")
    .insert({ ...stripDashes(parsed.data), created_by: user.id })
    .select("*")
    .single();
  if (error) {
    logger.error("[admin/announcements] insert failed", error);
    return NextResponse.json({ error: "שמירת ההודעה נכשלה" }, { status: 500 });
  }
  return NextResponse.json({ announcement: data }, { status: 201 });
});

export const PATCH = withAdminWrite(async (req, supabase) => {
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "נתונים לא תקינים", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { id, ...changes } = parsed.data;
  const { data, error } = await supabase
    .from("announcements")
    .update(stripDashes(changes))
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) {
    logger.error("[admin/announcements] update failed", error);
    return NextResponse.json({ error: "עדכון ההודעה נכשל" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "ההודעה לא נמצאה" }, { status: 404 });
  return NextResponse.json({ announcement: data });
});

export const DELETE = withAdminWrite(async (req, supabase) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "מזהה חסר" }, { status: 400 });
  }
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) {
    logger.error("[admin/announcements] delete failed", error);
    return NextResponse.json({ error: "מחיקת ההודעה נכשלה" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
});
