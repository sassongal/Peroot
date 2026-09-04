import { NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/api-middleware";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

/**
 * Connected OAuth apps — the self-service revocation the oauth_connect
 * migration provisioned RLS for ("future settings UI") but never shipped
 * (review 2026-09-04). Until this route existed, an approved MCP client held
 * a refresh token that rotates itself every 90 days forever, and the user
 * had no way to disconnect it: not from Settings, not by changing password.
 *
 * GET    → the user's live grants, one row per client, via the RLS client
 *          (oauth_tokens has own-row SELECT/DELETE policies).
 * DELETE → revoke every token for one client_id. RLS scopes the delete to
 *          the caller's rows, so client_id needs no further validation.
 */

export const GET = withUser(
  async (_req, ctx) => {
    // Explicit user scope even though RLS covers the cookie path: under
    // Bearer auth withUser hands the handler the service client, where an
    // unscoped query would read every user's grants.
    const { data, error } = await ctx.db
      .from("oauth_tokens")
      .select("client_id, token_type, created_at, last_used_at, expires_at")
      .eq("user_id", ctx.user!.id)
      .eq("revoked", false)
      .gt("expires_at", new Date().toISOString());
    if (error) {
      logger.error("[authorized-apps] list failed:", error);
      return NextResponse.json({ error: "פעולת מסד הנתונים נכשלה" }, { status: 500 });
    }

    // One row per client: newest grant, latest use.
    const byClient = new Map<
      string,
      { client_id: string; connected_at: string; last_used_at: string | null }
    >();
    for (const t of data ?? []) {
      const cur = byClient.get(t.client_id);
      const lastUsed = t.last_used_at as string | null;
      if (!cur) {
        byClient.set(t.client_id, {
          client_id: t.client_id,
          connected_at: t.created_at,
          last_used_at: lastUsed,
        });
      } else {
        if (t.created_at < cur.connected_at) cur.connected_at = t.created_at;
        if (lastUsed && (!cur.last_used_at || lastUsed > cur.last_used_at))
          cur.last_used_at = lastUsed;
      }
    }

    // Client display names live in oauth_clients, which deliberately has no
    // user-facing policy — resolve them with the service client, scoped to
    // exactly the ids the user's own grants reference.
    const apps = [...byClient.values()];
    if (apps.length > 0) {
      const { data: clients } = await createServiceClient()
        .from("oauth_clients")
        .select("client_id, client_name")
        .in(
          "client_id",
          apps.map((a) => a.client_id),
        );
      const names = new Map((clients ?? []).map((c) => [c.client_id, c.client_name]));
      return NextResponse.json({
        apps: apps.map((a) => ({ ...a, client_name: names.get(a.client_id) ?? a.client_id })),
      });
    }
    return NextResponse.json({ apps: [] });
  },
  { rateLimit: "me" },
);

export const DELETE = withUser(
  async (req: NextRequest, ctx) => {
    let body: { client_id?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "גוף הבקשה אינו JSON תקין" }, { status: 400 });
    }
    if (typeof body.client_id !== "string" || !body.client_id) {
      return NextResponse.json({ error: "client_id חסר" }, { status: 400 });
    }
    // Same explicit scope as the GET: without it, a Bearer-authenticated call
    // runs on the service client and would revoke this client's tokens for
    // EVERY user.
    const { error } = await ctx.db
      .from("oauth_tokens")
      .delete()
      .eq("user_id", ctx.user!.id)
      .eq("client_id", body.client_id);
    if (error) {
      logger.error("[authorized-apps] revoke failed:", error);
      return NextResponse.json({ error: "הניתוק נכשל" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  },
  { rateLimit: "me" },
);
