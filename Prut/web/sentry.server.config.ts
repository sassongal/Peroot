import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",

  // Performance tracing — match client rate
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Capture console.error as Sentry events — catches unhandled server-side errors
  // that aren't thrown exceptions (e.g. logger.error calls)
  integrations: [Sentry.captureConsoleIntegration({ levels: ["error"] })],

  // Never send user emails / IP addresses — GDPR
  sendDefaultPii: false,

  // Drop noisy server-side events
  beforeSend(event, hint) {
    const err = hint?.originalException;
    if (err instanceof Error) {
      const msg = err.message?.toLowerCase() ?? "";
      // Supabase auth "not found" is expected for unauthenticated requests
      if (msg.includes("jwt expired") || msg.includes("invalid refresh token")) return null;
      // Next.js aborted requests (user navigated away)
      if (msg.includes("the operation was aborted") || msg.includes("socket hang up")) return null;
    }
    return event;
  },
});
