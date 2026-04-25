"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/client";

/**
 * Attaches the authenticated user's ID to every Sentry event so that
 * errors can be correlated across sessions without sending PII.
 * Only the user ID is forwarded — no email, no name.
 */
export function SentryUserProvider() {
  useEffect(() => {
    const supabase = createClient();

    // Set initial user if already logged in
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        Sentry.setUser({ id: data.user.id });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        Sentry.setUser({ id: session.user.id });
      } else {
        Sentry.setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
