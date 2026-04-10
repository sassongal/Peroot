/**
 * Product email automation flags (Vercel env).
 *
 * Policy (default): only (1) Peroot signup welcome via auth callback and
 * (2) LemonSqueezy webhook emails (churn + admin alert). No reengagement drip,
 * no onboarding cron resends, no duplicate welcome on in-app onboarding complete.
 *
 * - ONBOARDING_EMAILS_ENABLED: welcome at signup (auth callback).
 * - ONBOARDING_CRON_FALLBACK_ENABLED: optional send-emails cron for stuck sequences only.
 * - REENGAGEMENT_EMAILS_ENABLED: inactive-user drip — off unless explicitly true.
 */

export function isOnboardingEmailAutomationEnabled(): boolean {
  return process.env.ONBOARDING_EMAILS_ENABLED === "true";
}

/** Resend onboarding steps via cron (recovery only). Off by default — callback sends welcome. */
export function isOnboardingCronFallbackEnabled(): boolean {
  return process.env.ONBOARDING_CRON_FALLBACK_ENABLED === "true";
}

export function isReengagementEmailAutomationEnabled(): boolean {
  return process.env.REENGAGEMENT_EMAILS_ENABLED === "true";
}

export function getEmailAutomationSnapshot() {
  return {
    onboarding: isOnboardingEmailAutomationEnabled(),
    onboardingCronFallback: isOnboardingCronFallbackEnabled(),
    reengagement: isReengagementEmailAutomationEnabled(),
    lemonsqueezyLifecycle: true,
    newsletterBroadcast: false,
  };
}
