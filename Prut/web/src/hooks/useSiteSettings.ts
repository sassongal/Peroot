import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { QUOTA_FALLBACK } from "@/lib/quota-policy";

interface SiteSettings {
  id: string;
  site_name: string;
  site_description: string;
  contact_email: string;
  support_url: string;
  /** @deprecated Legacy client-side guest counter. Use guest_daily_limit. */
  max_free_prompts: number;
  default_credits: number;
  /** Registered free tier, per rolling 24h window. */
  daily_free_limit: number;
  /** Anonymous visitor, per rolling 24h window. */
  guest_daily_limit: number;
  registration_bonus: number;
  /** Referral reward per referred friend, paid into the bonus bucket. */
  referral_bonus_credits: number;
  /** Days a bonus stays usable after the latest grant. */
  referral_bonus_days: number;
  /** Safety ceiling on the bonus bucket. */
  bonus_credits_cap: number;
  /** "activation" (friend's first enhancement) or "signup". */
  referral_grant_on: "activation" | "signup";
  theme_primary_color: string;
  theme_secondary_color: string;
  maintenance_mode: boolean;
  allow_guest_access: boolean;
  updated_at: string;
}

// REAL site defaults from actual usage
const defaultSettings: SiteSettings = {
  id: "",
  site_name: "Peroot",
  site_description: "מחולל פרומפטים מקצועי מבוסס AI",
  contact_email: "gal@joya-tech.net",
  support_url: "https://www.peroot.space/faq",
  // Quota numbers come from the one policy module, never written inline here:
  // this object is what the whole client falls back to when the settings read
  // fails, so an inline number would quietly become a second source of truth.
  max_free_prompts: QUOTA_FALLBACK.guestDaily,
  default_credits: QUOTA_FALLBACK.freeDaily,
  daily_free_limit: QUOTA_FALLBACK.freeDaily,
  guest_daily_limit: QUOTA_FALLBACK.guestDaily,
  registration_bonus: 0, // Rolling 24h window: no registration bonus (see 20260424_rolling_credits.sql)
  referral_bonus_credits: QUOTA_FALLBACK.referralBonus,
  referral_bonus_days: QUOTA_FALLBACK.referralBonusDays,
  bonus_credits_cap: QUOTA_FALLBACK.bonusCap,
  referral_grant_on: "activation",
  theme_primary_color: "#F59E0B", // Amber/Orange from site
  theme_secondary_color: "#EAB308", // Yellow from site
  maintenance_mode: false,
  allow_guest_access: true,
  updated_at: new Date().toISOString(),
};

let settingsCache: SiteSettings | null = null;

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(settingsCache || defaultSettings);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const subscribedRef = useRef(false);

  useEffect(() => {
    loadSettings();

    // Guard against duplicate subscriptions (e.g. StrictMode double-invoke)
    if (subscribedRef.current) return;

    // Site settings change very rarely (admin-only edits). Only open a
    // real-time WebSocket for authenticated users to avoid wasting a
    // connection for every anonymous visitor.
    let channel: RealtimeChannel | null = null;

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user || subscribedRef.current) return;
      subscribedRef.current = true;

      channel = supabase
        .channel("site_settings_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "site_settings" },
          (payload: RealtimePostgresChangesPayload<SiteSettings>) => {
            logger.info("[Settings] Real-time update received:", payload);
            if (payload.new) {
              const newSettings = payload.new as SiteSettings;
              setSettings(newSettings);
              settingsCache = newSettings;
              applyThemeColors(newSettings);

              // Show toast notification
              toast.success("הגדרות האתר עודכנו מהשרת");
            }
          },
        )
        .subscribe((status) => {
          logger.info("[Settings] Subscription status:", status);
        });
    });

    return () => {
      subscribedRef.current = false;
      if (channel) {
        channel.unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSettings() {
    try {
      const { data, error } = await supabase.from("site_settings").select("*").maybeSingle();

      if (data) {
        logger.info("[Settings] Loaded from DB:", data);
        setSettings(data);
        settingsCache = data;
        applyThemeColors(data);
      } else if (error) {
        // Falls back to defaultSettings + default theme, so the app stays usable.
        // Non-actionable transient read failure — warn, don't error into Sentry.
        logger.warn("[Settings] Failed to load:", error);
        applyThemeColors(defaultSettings);
      }
    } catch (error) {
      logger.warn("[Settings] Error:", error);
      applyThemeColors(defaultSettings);
    } finally {
      setLoading(false);
    }
  }

  function applyThemeColors(settings: SiteSettings) {
    if (typeof document !== "undefined") {
      const root = document.documentElement;

      // Apply primary color
      root.style.setProperty("--color-primary", settings.theme_primary_color);
      root.style.setProperty("--color-secondary", settings.theme_secondary_color);

      // Also update the glow color for yellow theme
      root.style.setProperty("--glow-color", `45 95% 65%`); // HSL for yellow glow

      logger.info("[Settings] Applied theme colors:", {
        primary: settings.theme_primary_color,
        secondary: settings.theme_secondary_color,
      });
    }
  }

  return { settings, loading, refresh: loadSettings };
}
