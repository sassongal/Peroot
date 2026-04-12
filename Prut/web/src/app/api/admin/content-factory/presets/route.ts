import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import { z } from "zod";

const PresetConfigSchema = z.object({
  topic: z.string().min(1).max(500).optional(),
  category: z.string().min(1).max(200).optional(),
  template: z.enum(["guide", "listicle", "comparison", "faq"]).optional(),
});

const CreatePresetSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["blog", "prompt"]),
  config: PresetConfigSchema,
});

const DeletePresetSchema = z.object({
  id: z.string().uuid(),
});

/**
 * GET /api/admin/content-factory/presets
 *
 * Returns all content-factory presets ordered by creation date.
 */
export const GET = withAdmin(async (_req, supabase) => {
  try {
    const { data, error: dbError } = await supabase
      .from("content_factory_presets")
      .select("*")
      .order("created_at", { ascending: false });

    if (dbError) {
      logger.error("[admin/content-factory/presets] GET error:", dbError);
      return NextResponse.json({ error: "Database operation failed" }, { status: 500 });
    }

    return NextResponse.json({ presets: data ?? [] });
  } catch (err) {
    logger.error("[admin/content-factory/presets] GET unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
});

/**
 * POST /api/admin/content-factory/presets
 *
 * Create a new content-factory preset.
 * Body: { name, type, config: { topic?, category?, template? } }
 */
export const POST = withAdmin(async (req, supabase, user) => {
  try {
    const body = await req.json();
    const parsed = CreatePresetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid preset data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, type, config } = parsed.data;

    const { data, error: dbError } = await supabase
      .from("content_factory_presets")
      .insert({
        name,
        type,
        config,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      logger.error("[admin/content-factory/presets] POST insert error:", dbError);
      return NextResponse.json({ error: "Database operation failed" }, { status: 500 });
    }

    logger.info(`[admin/content-factory/presets] Preset created: "${name}" (type: ${type}) by user ${user.id}`);

    return NextResponse.json({ preset: data }, { status: 201 });
  } catch (err) {
    logger.error("[admin/content-factory/presets] POST unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
});

/**
 * DELETE /api/admin/content-factory/presets
 *
 * Delete a preset by id.
 * Body: { id }
 */
export const DELETE = withAdmin(async (req, supabase, user) => {
  try {
    const body = await req.json();
    const parsed = DeletePresetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid or missing preset id" },
        { status: 400 }
      );
    }

    const { id } = parsed.data;

    const { error: dbError } = await supabase
      .from("content_factory_presets")
      .delete()
      .eq("id", id);

    if (dbError) {
      logger.error("[admin/content-factory/presets] DELETE error:", dbError);
      return NextResponse.json({ error: "Database operation failed" }, { status: 500 });
    }

    logger.info(`[admin/content-factory/presets] Preset deleted: ${id} by user ${user.id}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("[admin/content-factory/presets] DELETE unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
});
