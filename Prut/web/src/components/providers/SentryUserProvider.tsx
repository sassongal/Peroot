"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/client";

/**
 * Attaches authenticated user context to every Sentry event:
 * - user.id only (no email/name — GDPR)
 * - tag: plan (free | pro | <plan_name>)
 * - tag: role (user | admin)
 * - tag: locale (he — fixed for Peroot)
 */
export function SentryUserProvider() {
  useEffect(() => {
    const supabase = createClient();

    async function syncUserContext(userId: string) {
      Sentry.setUser({ id: userId });
      Sentry.setTag("locale", "he");

      // Fetch plan + role without exposing PII
      const [{ data: subData }, { data: roleData }] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("plan_name, status")
          .eq("user_id", userId)
          .eq("status", "active")
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      ]);

      Sentry.setTag("plan", subData?.plan_name ?? "free");
      Sentry.setTag("role", roleData?.role ?? "user");
    }

    // Set initial context if already logged in
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) void syncUserContext(data.user.id).catch(() => {});
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void syncUserContext(session.user.id).catch(() => {});
      } else {
        Sentry.setUser(null);
        Sentry.setTag("plan", null as unknown as string);
        Sentry.setTag("role", null as unknown as string);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
