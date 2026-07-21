"use client";

import posthog from "posthog-js";

export const initAnalytics = () => {
  if (typeof window !== "undefined") {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    if (key && host) {
      posthog.init(key, {
        api_host: host,
        person_profiles: "identified_only",
        capture_pageview: false,
        capture_pageleave: true,
        persistence: "localStorage+cookie",
        // Session Replay: opt-in by default; sampling rate is controlled
        // remotely from the PostHog dashboard (recommended start: 10%).
        disable_session_recording: false,
        session_recording: {
          // Mask all inputs — Peroot users paste prompts that may
          // contain PII or proprietary instructions.
          maskAllInputs: true,
          // Honor explicit opt-out attribute on any element.
          maskTextSelector: "[data-private]",
        },
        // Web Vitals (LCP/CLS/INP) and frustration signals.
        capture_performance: true,
        capture_dead_clicks: true,
        rageclick: true,
      });

      // Capture UTM params on first load
      const params = new URLSearchParams(window.location.search);
      const utmProps: Record<string, string> = {};
      ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((key) => {
        const val = params.get(key);
        if (val) utmProps[key] = val;
      });
      if (Object.keys(utmProps).length > 0) {
        posthog.register(utmProps);
      }

      // Set initial referrer
      if (document.referrer && !document.referrer.includes(window.location.hostname)) {
        posthog.register_once({ $initial_referrer: document.referrer });
      }
    }
  }
};

export const analytics = posthog;

// ─── GA4 conversion mirror ────────────────────────────────────────────────────
// PostHog is our primary product-analytics layer, but GA4 only received page
// views (gtag 'config') — so Google's conversion, attribution and
// Search-Console-linked reports were blind to every real conversion. We mirror a
// whitelist of conversion moments to GA4 using the recommended GA4 event names.
// Map: internal (PostHog) event name → GA4 event name. Only conversions belong
// here; leave exploratory/product events to PostHog to avoid GA4 noise.
const GA4_EVENT_MAP: Record<string, string> = {
  user_signup: "sign_up",
  enhance_complete: "prompt_generated",
  prompt_enhance: "credit_used",
  checkout_opened: "upgrade_click",
  paywall_hit: "paywall_hit",
};

type GtagFn = (command: "event", eventName: string, params?: Record<string, unknown>) => void;

function mirrorToGA4(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const ga4Event = GA4_EVENT_MAP[event];
  if (!ga4Event) return;
  const gtag = (window as unknown as { gtag?: GtagFn }).gtag;
  if (typeof gtag === "function") {
    gtag("event", ga4Event, properties);
  }
}

// ─── Typed Event Helpers ──────────────────────────────────────────────────────

function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window !== "undefined" && analytics) {
    analytics.capture(event, properties);
    mirrorToGA4(event, properties);
  }
}

/** Track when a user starts a prompt enhancement */
export function trackPromptEnhance(category: string, mode: string, inputLength: number) {
  trackEvent("prompt_enhance", { category, mode, input_length: inputLength });
}

/** Track when enhancement completes */
export function trackEnhanceComplete(mode: string, score: number, durationMs: number) {
  trackEvent("enhance_complete", { mode, score, duration_ms: durationMs });
}

/** Track prompt copy */
export function trackPromptCopy(source: "result" | "library" | "personal") {
  trackEvent("prompt_copy", { source });
}

/** Public library prompt — user chose “use in Peroot” from the library */
export function trackLibraryUse(promptId: string, promptTitle: string) {
  trackEvent("library_prompt_use", { prompt_id: promptId, prompt_title: promptTitle });
}

/** Email/password signup form submitted successfully (verification email sent) */
export function trackSignUp(method: string) {
  trackEvent("user_signup", { method });
}

/** Product feature first-use / discovery markers (`peroot_used_*` keys, etc.) */
export function trackFeatureUse(feature: string) {
  trackEvent("feature_use", { feature });
}

/** User ran a prompt chain (completed all steps) */
export function trackChainRun(chainId: string, stepCount: number) {
  trackEvent("chain_run", { chain_id: chainId, step_count: stepCount });
}

/** Track target model selection in prompt improver (text modes) */
export function trackTargetModelSelect(targetModel: string, previousModel?: string) {
  trackEvent("target_model_select", {
    target_model: targetModel,
    previous_model: previousModel ?? null,
  });
}

/** Track social share button click */
export function trackShare(platform: string, url: string) {
  trackEvent("blog_share", { platform, url });
}

/** Identify user for PostHog */
export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (typeof window !== "undefined" && analytics) {
    analytics.identify(userId, properties);
    // Opt Pro users into session replay — sampling rate is still controlled
    // by the PostHog remote config; this just ensures Pro sessions are eligible.
    // Only starts if posthog-js consent/opt-out state allows it.
    if (properties?.plan === "pro" && !analytics.has_opted_out_capturing()) {
      analytics.startSessionRecording();
    }
  }
}

/** Track when a free user hits the daily-credit paywall */
export function trackPaywallHit(reason: "daily_limit" | "feature_locked", context?: string) {
  trackEvent("paywall_hit", { reason, context: context ?? null });
}

/** Track when checkout opens (LemonSqueezy modal/redirect) */
export function trackCheckoutOpened(plan: "pro_monthly" | "pro_yearly") {
  trackEvent("checkout_opened", { plan });
}
