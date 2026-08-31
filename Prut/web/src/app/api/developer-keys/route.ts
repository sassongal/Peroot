import { NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@/lib/api-middleware";
import { generateApiKey } from "@/lib/api-keys";
import { logger } from "@/lib/logger";

/**
 * Peroot Connect — developer API key management.
 *
 * GET    /api/developer-keys        list the caller's keys (metadata only)
 * POST   /api/developer-keys        create a named key — raw key returned ONCE
 * DELETE /api/developer-keys        revoke a key by id (soft: is_active=false)
 *
 * Auth + correctly-scoped client are owned by withUser (cookie session or
 * extension Bearer). RLS policies on developer_api_keys scope every query to
 * the caller. Available to every authenticated user — usage of the keys is
 * governed by the user's own credit allowance (free 1/day, PRO monthly), not
 * by key possession.
 */

/** Cap on ACTIVE keys per user — one per client is the intended pattern. */
const MAX_ACTIVE_KEYS = 10;

export const GET = withUser(
  async (_req, ctx) => {
    const { data, error } = await ctx.db
      .from("developer_api_keys")
      .select("id, name, key_prefix, is_active, created_at, last_used_at, expires_at")
      .eq("user_id", ctx.user!.id)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("[DeveloperKeys] list failed:", error);
      return NextResponse.json(
        { error: "טעינת המפתחות נכשלה", code: "list_failed" },
        { status: 500 },
      );
    }
    return NextResponse.json({ keys: data ?? [] });
  },
  { rateLimit: "me" },
);

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(60),
});

export const POST = withUser(
  async (req, ctx) => {
    let name: string;
    try {
      ({ name } = CreateSchema.parse(await req.json()));
    } catch {
      return NextResponse.json(
        { error: "שם המפתח חייב להיות באורך 1-60 תווים", code: "invalid_request" },
        { status: 400 },
      );
    }

    const { count, error: countErr } = await ctx.db
      .from("developer_api_keys")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ctx.user!.id)
      .eq("is_active", true);
    if (countErr) {
      logger.error("[DeveloperKeys] count failed:", countErr);
      return NextResponse.json({ error: "שגיאת שרת", code: "internal_error" }, { status: 500 });
    }
    if ((count ?? 0) >= MAX_ACTIVE_KEYS) {
      return NextResponse.json(
        {
          error: `הגעת למקסימום ${MAX_ACTIVE_KEYS} מפתחות פעילים, בטל מפתח ישן כדי ליצור חדש`,
          code: "too_many_keys",
        },
        { status: 409 },
      );
    }

    const key = generateApiKey();
    const { data: inserted, error } = await ctx.db
      .from("developer_api_keys")
      .insert({
        user_id: ctx.user!.id,
        key_hash: key.hash,
        key_prefix: key.prefix,
        name,
      })
      .select("id, name, key_prefix, created_at")
      .single();

    if (error || !inserted) {
      logger.error("[DeveloperKeys] insert failed:", error);
      return NextResponse.json(
        { error: "יצירת המפתח נכשלה", code: "create_failed" },
        { status: 500 },
      );
    }

    // The ONLY time the raw key ever leaves the server.
    return NextResponse.json(
      {
        key: key.raw,
        id: inserted.id,
        name: inserted.name,
        key_prefix: inserted.key_prefix,
        created_at: inserted.created_at,
        warning: "שמור את המפתח עכשיו, הוא לא יוצג שוב",
      },
      { status: 201 },
    );
  },
  { rateLimit: "apiKeys" },
);

const RevokeSchema = z.object({
  id: z.string().uuid(),
});

export const DELETE = withUser(
  async (req, ctx) => {
    let id: string;
    try {
      ({ id } = RevokeSchema.parse(await req.json()));
    } catch {
      return NextResponse.json(
        { error: "מזהה מפתח לא תקין", code: "invalid_request" },
        { status: 400 },
      );
    }

    // Soft revoke — the row stays for audit; api_usage_logs keeps attribution.
    const { data, error } = await ctx.db
      .from("developer_api_keys")
      .update({ is_active: false })
      .eq("id", id)
      .eq("user_id", ctx.user!.id)
      .select("id")
      .maybeSingle();

    if (error) {
      logger.error("[DeveloperKeys] revoke failed:", error);
      return NextResponse.json(
        { error: "ביטול המפתח נכשל", code: "revoke_failed" },
        { status: 500 },
      );
    }
    if (!data) {
      return NextResponse.json({ error: "מפתח לא נמצא", code: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ revoked: true, id: data.id });
  },
  { rateLimit: "apiKeys" },
);
