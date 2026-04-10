/**
 * Product email automation flags (Vercel env).
 *
 * - Onboarding: welcome + optional cron fallback (see send-emails cron).
 * - Reengagement: inactive-user drip — off unless explicitly enabled.
 */

export function isOnboardingEmailAutomationEnabled(): boolean {
  return process.env.ONBOARDING_EMAILS_ENABLED === "true";
}

export function isReengagementEmailAutomationEnabled(): boolean {
  return process.env.REENGAGEMENT_EMAILS_ENABLED === "true";
}

export function getEmailAutomationSnapshot() {
  return {
    onboarding: isOnboardingEmailAutomationEnabled(),
    reengagement: isReengagementEmailAutomationEnabled(),
    lemonsqueezyLifecycle: true,
    newsletterBroadcast: false,
  };
}
