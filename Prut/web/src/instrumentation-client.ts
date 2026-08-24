import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",

  // Performance tracing — 10% in prod keeps quota low while covering enough traffic
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay — record 5% of all sessions, 100% of sessions that hit an error
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      // GDPR: mask all text + inputs in recordings. Media (images/video) is NOT blocked
      // because product screenshots don't contain PII.
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: false,
    }),
  ],

  // Never send user emails / IP addresses — GDPR
  sendDefaultPii: false,

  // Drop known-noisy events that are not actionable
  beforeSend(event, hint) {
    const err = hint?.originalException;
    if (err instanceof Error) {
      const msg = err.message?.toLowerCase() ?? "";
      if (
        msg.includes("failed to fetch") ||
        msg.includes("networkerror") ||
        msg.includes("load failed") || // Safari network cancel
        msg.includes("the user aborted a request") ||
        msg.includes("resizeobserver loop") ||
        msg.includes("script error") || // Cross-origin, no useful detail
        msg.includes("cancelled") ||
        msg.includes("chunk load error") // Webpack chunk reload; handled by SW
      ) {
        return null;
      }
    }
    // Drop browser-extension-injected errors
    const frames = event.exception?.values?.[0]?.stacktrace?.frames ?? [];
    if (
      frames.some(
        (f) =>
          f.filename?.includes("chrome-extension://") || f.filename?.includes("moz-extension://"),
      )
    ) {
      return null;
    }
    return event;
  },
});
