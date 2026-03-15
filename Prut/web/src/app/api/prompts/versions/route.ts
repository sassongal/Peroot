import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// GET /api/prompts/versions?promptId=xxx — list versions for a prompt
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const promptId = request.nextUrl.searchParams.get("promptId");
  if (!promptId) {
    return NextResponse.json({ error: "promptId required" }, { status: 400 });
  }

  // Verify ownership
  const { data: prompt } = await supabase
    .from("personal_library")
    .select("id")
    .eq("id", promptId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  }

  const { data: versions, error } = await supabase
    .from("prompt_versions")
    .select("id, version_number, content, title, created_at")
    .eq("prompt_id", promptId)
    .order("version_number", { ascending: false })
    .limit(50);

  if (error) {
    logger.error("[Versions] Failed to fetch:", error);
    return NextResponse.json({ error: "Failed to fetch versions" }, { status: 500 });
  }

  return NextResponse.json({ versions: versions || [] });
}

// POST /api/prompts/versions — restore a specific version
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { promptId, versionId } = await request.json();
  if (!promptId || !versionId) {
    return NextResponse.json({ error: "promptId and versionId required" }, { status: 400 });
  }

  // Verify ownership
  const { data: prompt } = await supabase
    .from("personal_library")
    .select("id")
    .eq("id", promptId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  }

  // Get the version content
  const { data: version } = await supabase
    .from("prompt_versions")
    .select("content, title")
    .eq("id", versionId)
    .eq("prompt_id", promptId)
    .maybeSingle();

  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  // Update the prompt (this will trigger the version save for the current content)
  const { error } = await supabase
    .from("personal_library")
    .update({
      prompt: version.content,
      title: version.title,
      updated_at: new Date().toISOString(),
    })
    .eq("id", promptId);

  if (error) {
    logger.error("[Versions] Failed to restore:", error);
    return NextResponse.json({ error: "Failed to restore version" }, { status: 500 });
  }

  return NextResponse.json({ success: true, content: version.content, title: version.title });
}
