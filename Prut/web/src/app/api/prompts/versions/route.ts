import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { withUser } from "@/lib/api-middleware";

// GET /api/prompts/versions?promptId=xxx - list versions for a prompt
export const GET = withUser(
  async (request, ctx) => {
    const promptId = request.nextUrl.searchParams.get("promptId");
    if (!promptId) {
      return NextResponse.json({ error: "promptId required" }, { status: 400 });
    }

    // Verify ownership
    const { data: prompt } = await ctx.db
      .from("personal_library")
      .select("id")
      .eq("id", promptId)
      .eq("user_id", ctx.user!.id)
      .maybeSingle();

    if (!prompt) {
      return NextResponse.json({ error: "הפרומפט לא נמצא", code: "not_found" }, { status: 404 });
    }

    const { data: versions, error } = await ctx.db
      .from("prompt_versions")
      .select("id, version_number, content, title, created_at")
      .eq("prompt_id", promptId)
      .order("version_number", { ascending: false })
      .limit(50);

    if (error) {
      logger.error("[Versions] Failed to fetch:", error);
      return NextResponse.json(
        { error: "טעינת הגרסאות נכשלה", code: "load_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ versions: versions || [] });
  },
  { rateLimit: "none" },
);

// POST /api/prompts/versions - restore a specific version
export const POST = withUser(
  async (request, ctx) => {
    const { promptId, versionId } = await request.json();
    if (!promptId || !versionId) {
      return NextResponse.json({ error: "promptId and versionId required" }, { status: 400 });
    }

    // Verify ownership
    const { data: prompt } = await ctx.db
      .from("personal_library")
      .select("id")
      .eq("id", promptId)
      .eq("user_id", ctx.user!.id)
      .maybeSingle();

    if (!prompt) {
      return NextResponse.json({ error: "הפרומפט לא נמצא", code: "not_found" }, { status: 404 });
    }

    // Get the version content
    const { data: version } = await ctx.db
      .from("prompt_versions")
      .select("content, title")
      .eq("id", versionId)
      .eq("prompt_id", promptId)
      .maybeSingle();

    if (!version) {
      return NextResponse.json({ error: "הגרסה לא נמצאה", code: "not_found" }, { status: 404 });
    }

    // Update the prompt (this will trigger the version save for the current content)
    const { error } = await ctx.db
      .from("personal_library")
      .update({
        prompt: version.content,
        title: version.title,
        updated_at: new Date().toISOString(),
      })
      .eq("id", promptId);

    if (error) {
      logger.error("[Versions] Failed to restore:", error);
      return NextResponse.json(
        { error: "שחזור הגרסה נכשל", code: "restore_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, content: version.content, title: version.title });
  },
  { rateLimit: "none" },
);
