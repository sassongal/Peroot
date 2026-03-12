import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";

// GET: List user's folders
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("prompt_folders")
    .select("id, name, color, icon, sort_index")
    .eq("user_id", user.id)
    .order("sort_index", { ascending: true });

  if (error) {
    logger.error("[Folders] Failed to list:", error);
    return NextResponse.json({ error: "Failed to load folders" }, { status: 500 });
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const json = await req.json();
    const { name, color, icon } = CreateSchema.parse(json);

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
      return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
    }

    return NextResponse.json({ folder: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid folder data" }, { status: 400 });
    }
    logger.error("[Folders] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
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
      return NextResponse.json({ error: "Failed to update folder" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid update data" }, { status: 400 });
    }
    logger.error("[Folders] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE: Delete a folder (prompts inside move to "unfiled")
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Folder ID required" }, { status: 400 });
  }

  // folder_id column has ON DELETE SET NULL, so prompts will be unfiled automatically
  const { error } = await supabase
    .from("prompt_folders")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    logger.error("[Folders] Failed to delete:", error);
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
