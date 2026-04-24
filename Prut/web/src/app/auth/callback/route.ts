import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const origin = siteUrl || new URL(request.url).origin;
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next =
    type === "recovery" ? `${basePath}/auth/reset-password` : (searchParams.get("next") ?? "/");

  if (!code) {
    return NextResponse.redirect(`${origin}${basePath}/login?error=no-code`);
  }

  const cookieStore = await cookies();

  // We'll collect cookies here and set them on the response
  const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookies) {
          cookies.forEach((cookie) => {
            cookiesToSet.push(cookie);
          });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    logger.info("[Callback] Error:", error?.message);
    return NextResponse.redirect(`${origin}${basePath}/login?error=auth-failed`);
  }

  // Create the redirect response
  // Ensure next path starts with basePath if it doesn't already
  const redirectPath = next.startsWith(basePath) ? next : `${basePath}${next}`;
  const response = NextResponse.redirect(`${origin}${redirectPath}`);

  // Now set all the cookies on the response
  // The SDK sets cookies asynchronously, so we need to wait a tick
  await new Promise((resolve) => setTimeout(resolve, 0));

  // If no cookies were collected, build them manually from the session
  if (cookiesToSet.length === 0) {
    const sessionStr = JSON.stringify({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
      user: data.session.user,
    });

    const encoded = Buffer.from(sessionStr).toString("base64");
    // Derive the Supabase cookie name from the project URL so the fallback
    // keeps working if the project is ever migrated to a new ref.
    // Format: sb-<project-ref>-auth-token (Supabase SSR convention).
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/i)?.[1];
    const cookieName = projectRef ? `sb-${projectRef}-auth-token` : "sb-auth-token";
    const chunkSize = 3500;

    const cookieOptions = {
      path: basePath || "/",
      sameSite: "lax" as const,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    };

    // Clear the code verifier
    response.cookies.set(`${cookieName}-code-verifier`, "", { path: basePath || "/", maxAge: 0 });

    if (encoded.length <= chunkSize) {
      response.cookies.set(cookieName, `base64-${encoded}`, cookieOptions);
    } else {
      // Split into chunks
      for (let i = 0, chunk = 0; i < encoded.length; i += chunkSize, chunk++) {
        response.cookies.set(
          `${cookieName}.${chunk}`,
          `base64-${encoded.slice(i, i + chunkSize)}`,
          cookieOptions,
        );
      }
    }
  } else {
    // Use the cookies from the SDK
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
  }

  logger.info("[Callback] Success! User:", data.session.user.email);
  logger.info(
    "[Callback] Cookies on response:",
    response.cookies
      .getAll()
      .map((c) => c.name)
      .join(", "),
  );

  // Grant initial daily quota to new users (created within last 60 seconds).
  // No registration bonus — new users get daily_free_limit only, with last_prompt_at
  // left NULL so the rolling-24h window hasn't started yet and they see full quota.
  const createdAt = new Date(data.session.user.created_at).getTime();
  const isNewUser = Date.now() - createdAt < 60_000;

  // Log login event (fire-and-forget)
  void supabase.from("activity_logs").insert({
    user_id: data.session.user.id,
    action: isNewUser ? "user_registered" : "user_login",
    entity_type: "auth",
    entity_id: data.session.user.id,
    details: { provider: data.session.user.app_metadata?.provider ?? "email" },
  });

  if (isNewUser) {
    try {
      // Give new users their full daily quota. last_prompt_at stays NULL so
      // no timer is displayed until they actually run their first prompt.
      const { data: siteSettings } = await supabase
        .from("site_settings")
        .select("daily_free_limit")
        .single();

      const dailyLimit = siteSettings?.daily_free_limit ?? 2;
      const totalCredits = dailyLimit;

      await supabase
        .from("profiles")
        .update({
          credits_balance: totalCredits,
          credits_refreshed_at: new Date().toISOString(),
          last_prompt_at: null,
        })
        .eq("id", data.session.user.id);

      logger.info("[Callback] New user initial quota granted:", totalCredits, "credits");

      // Log to credit ledger
      try {
        await supabase.rpc("log_credit_change", {
          p_user_id: data.session.user.id,
          p_delta: totalCredits,
          p_balance_after: totalCredits,
          p_reason: "initial_quota",
          p_source: "system",
        });
      } catch (ledgerErr) {
        logger.error("[Callback] Failed to log credit ledger:", ledgerErr);
      }

      // Clear guest cookie — this session is now authenticated, the guest id is not needed.
      response.cookies.set("peroot_guest_id", "", { path: "/", maxAge: 0 });

      // Auto-redeem referral code if present in cookie
      const referralCode = cookieStore.get("referral_code")?.value;
      if (referralCode) {
        try {
          const { data: redeemResult } = await supabase.rpc("redeem_referral_code", {
            referral_code: referralCode,
          });
          if (redeemResult?.success) {
            logger.info(
              "[Callback] Referral code redeemed:",
              referralCode,
              "credits:",
              redeemResult.credits_awarded,
            );
            // Log referral bonus to credit ledger
            try {
              const creditsAwarded = redeemResult.credits_awarded ?? 5;
              await supabase.rpc("log_credit_change", {
                p_user_id: data.session.user.id,
                p_delta: creditsAwarded,
                p_balance_after: totalCredits + creditsAwarded,
                p_reason: "referral_bonus",
                p_source: "system",
              });
            } catch {
              /* ledger is best-effort */
            }
            // Store the bonus amount in a short-lived cookie so the client can show a toast
            response.cookies.set("referral_bonus", String(redeemResult.credits_awarded), {
              path: "/",
              maxAge: 60, // 1 minute, just long enough for the redirect
              httpOnly: false, // needs to be readable by JS
              sameSite: "lax",
            });
          } else {
            logger.info("[Callback] Referral code not redeemed:", redeemResult?.error);
          }
          // Clear the cookie regardless of outcome
          response.cookies.set("referral_code", "", { path: "/", maxAge: 0 });
        } catch (refErr) {
          logger.error("[Callback] Failed to redeem referral code:", refErr);
        }
      }

      // Start onboarding sequence and send welcome mail (service role: reliable id + send)
      try {
        const service = createServiceClient();
        const { data: seqRow, error: seqErr } = await service
          .from("email_sequences")
          .insert({
            user_id: data.session.user.id,
            sequence_type: "onboarding",
            current_step: 0,
            status: "active",
          })
          .select("id")
          .single();

        if (seqErr || !seqRow?.id) {
          logger.error("[Callback] Failed to start email sequence:", seqErr);
        } else {
          logger.info("[Callback] Onboarding email sequence started:", seqRow.id);
          const email = data.session.user.email;
          if (email) {
            const displayName =
              (data.session.user.user_metadata?.full_name as string | undefined) ||
              (data.session.user.user_metadata?.name as string | undefined) ||
              "";
            try {
              const { sendOnboardingWelcomeNow } =
                await import("@/lib/emails/onboarding-welcome-send");
              await sendOnboardingWelcomeNow({
                userId: data.session.user.id,
                email,
                displayName,
                sequenceId: seqRow.id,
              });
            } catch (welcomeErr) {
              logger.error("[Callback] Welcome email failed:", welcomeErr);
            }
          }
        }
      } catch (seqErr) {
        logger.error("[Callback] Onboarding setup error:", seqErr);
      }
    } catch (e) {
      logger.error("[Callback] Failed to grant registration bonus:", e);
    }
  }

  return response;
}
