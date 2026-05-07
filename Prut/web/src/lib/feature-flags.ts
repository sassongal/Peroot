"use client";

import { analytics } from "@/lib/analytics";

/**
 * Thin wrapper around PostHog feature flags with SSR-safe defaults.
 * All flag checks return `false` until PostHog has bootstrapped (deferred init).
 *
 * Flag names live in PostHog → Feature flags. Add a const here per active flag
 * so the compiler enforces typo-free usage.
 */

export const FLAGS = {
  /** A/B variant of Memory Palace surface (sidebar layout vs floating). */
  PALACE_LAYOUT_V2: "palace-layout-v2",
  /** Show new image-engine UI to a beta cohort. */
  IMAGE_ENGINE_BETA: "image-engine-beta",
  /** Bypass daily credit limit for QA accounts. */
  QA_UNLIMITED_CREDITS: "qa-unlimited-credits",
} as const;

export type FlagKey = (typeof FLAGS)[keyof typeof FLAGS];

/** Boolean flag — returns false on the server and during PostHog boot. */
export function isFlagEnabled(flag: FlagKey): boolean {
  if (typeof window === "undefined") return false;
  if (!analytics?.__loaded) return false;
  return analytics.isFeatureEnabled(flag) ?? false;
}

/**
 * Multivariate flag — returns string | undefined. Undefined means either
 * "not bootstrapped yet" or "user is in the control group".
 */
export function getFlagVariant(flag: FlagKey): string | undefined {
  if (typeof window === "undefined") return undefined;
  if (!analytics?.__loaded) return undefined;
  const v = analytics.getFeatureFlag(flag);
  return typeof v === "string" ? v : undefined;
}
