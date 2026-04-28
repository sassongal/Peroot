import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/ratelimit";

// GET: List user's folders
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "נדרשת התחברות", code: "auth_required" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("prompt_folders")
    .select("id, name, color, icon, sort_index")
    .eq("user_id", user.id)
    .order("sort_index", { ascending: true });

  if (error) {
    logger.error("[Folders] Failed to list:", error);
    return NextResponse.json(
      { error: "טעינת התיקיות נכשלה", code: "load_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ folders: data || [] });
}

const CreateSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().optional(),
  icon: z.string().optional(),
});

// POST: Create a folder
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "נדרשת התחברות", code: "auth_required" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(user.id, "folders");
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "חרגת ממגבלת הבקשות. נסה שוב מאוחר יותר", code: "rate_limited" },
      { status: 429 },
    );
  }

  try {
    const json = await req.json();
    const { name, color, icon } = CreateSchema.parse(json);

    // Check folder limit (max 50 per user)
    const { count } = await supabase
      .from("prompt_folders")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((count ?? 0) >= 50) {
      return NextResponse.json(
        { error: "הגעת למגבלת התיקיות (50)", code: "limit_reached" },
        { status: 400 },
      );
    }

    // Get max sort_index
    const { data: maxData } = await supabase
      .from("prompt_folders")
      .select("sort_index")
      .eq("user_id", user.id)
      .order("sort_index", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sortIndex = (maxData?.sort_index ?? -1) + 1;

    const { data, error } = await supabase
      .from("prompt_folders")
      .insert({
        user_id: user.id,
        name,
        color: color || "#f59e0b",
        icon: icon || "folder",
        sort_index: sortIndex,
      })
      .select()
      .single();

    if (error) {
      logger.error("[Folders] Failed to create:", error);
      return NextResponse.json(
        { error: "יצירת התיקייה נכשלה", code: "create_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ folder: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "נתוני התיקייה אינם תקינים", code: "invalid_request" },
        { status: 400 },
      );
    }
    logger.error("[Folders] Error:", error);
    return NextResponse.json(
      { error: "שגיאת שרת פנימית", code: "internal_error" },
      { status: 500 },
    );
  }
}

const UpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

// PATCH: Update a folder
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "נדרשת התחברות", code: "auth_required" }, { status: 401 });
  }

  try {
    const json = await req.json();
    const { id, ...updates } = UpdateSchema.parse(json);

    const { error } = await supabase
      .from("prompt_folders")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      logger.error("[Folders] Failed to update:", error);
      return NextResponse.json(
        { error: "עדכון התיקייה נכשל", code: "update_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "נתוני העדכון אינם תקינים", code: "invalid_request" },
        { status: 400 },
      );
    }
    logger.error("[Folders] Error:", error);
    return NextResponse.json(
      { error: "שגיאת שרת פנימית", code: "internal_error" },
      { status: 500 },
    );
  }
}

// DELETE: Delete a folder (prompts inside move to "unfiled")
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "נדרשת התחברות", code: "auth_required" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json(
      { error: "נדרש מזהה תיקייה תקין", code: "invalid_id" },
      { status: 400 },
    );
  }

  // folder_id column has ON DELETE SET NULL, so prompts will be unfiled automatically
  const { error } = await supabase
    .from("prompt_folders")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    logger.error("[Folders] Failed to delete:", error);
    return NextResponse.json(
      { error: "מחיקת התיקייה נכשלה", code: "delete_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
