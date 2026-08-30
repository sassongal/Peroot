import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAuthCode, getOAuthClient, OAUTH_SCOPE } from "@/lib/connect/oauth";
import { logger } from "@/lib/logger";

/**
 * POST /api/oauth/authorize — consent decision handler (cookie-authed,
 * same-origin form from /oauth/authorize, so the normal CSRF origin check in
 * proxy.ts protects it — deliberately NOT CSRF-exempt).
 *
 * approve → one-time auth code (Redis, 10 min) → 303 redirect_uri?code&state
 * deny    → 303 redirect_uri?error=access_denied&state
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const get = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : "";
  };
  const clientId = get("client_id");
  const redirectUri = get("redirect_uri");
  const codeChallenge = get("code_challenge");
  const state = get("state");
  // Clamp scope to the single supported value — the hidden form field is
  // attacker-editable, and whatever lands here is echoed back as "granted".
  const scope = OAUTH_SCOPE;
  const decision = get("decision");

  // Re-validate everything server-side — hidden form fields are attacker-editable.
  const client = clientId ? await getOAuthClient(clientId) : null;
  if (!client || !client.redirect_uris.includes(redirectUri)) {
    return NextResponse.json({ error: "בקשת הרשאה לא תקינה" }, { status: 400 });
  }

  const target = new URL(redirectUri);
  if (state) target.searchParams.set("state", state);

  if (decision !== "approve" || !codeChallenge) {
    target.searchParams.set("error", "access_denied");
    return NextResponse.redirect(target, 303);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }

  try {
    const code = await createAuthCode({
      userId: user.id,
      clientId,
      redirectUri,
      codeChallenge,
      scope,
    });
    target.searchParams.set("code", code);
    return NextResponse.redirect(target, 303);
  } catch (e) {
    logger.error("[OAuth] auth code creation failed:", e);
    return NextResponse.json({ error: "שגיאת שרת פנימית" }, { status: 500 });
  }
}
