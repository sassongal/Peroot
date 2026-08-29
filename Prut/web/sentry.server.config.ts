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
    // Message can live on the thrown Error OR only on the captured event
    // (e.g. Next.js console.error picked up by captureConsoleIntegration).
    const errMsg = err instanceof Error ? (err.message ?? "") : "";
    const eventMsg =
      event.message ?? event.exception?.values?.map((v) => v.value ?? "").join(" ") ?? "";
    const msg = `${errMsg} ${eventMsg}`.toLowerCase();

    // Supabase auth "not found" is expected for unauthenticated requests
    if (msg.includes("jwt expired") || msg.includes("invalid refresh token")) return null;
    // Client navigated away mid-request / streamed response — not actionable
    if (
      msg.includes("the operation was aborted") ||
      msg.includes("socket hang up") ||
      msg.includes("signal is aborted") || // Supabase auth-js LockManager on unmount
      msg.includes("aborted without reason") ||
      msg.includes("failed to pipe response") || // client disconnected mid-stream (/api/enhance)
      msg.includes("read econnreset") ||
      msg.includes("econnreset")
    ) {
      return null;
    }
    // Bots probing malformed URLs (trailing backslash → %5C) make Next try to
    // resolve a non-existent pages-router module. Guarded at the edge in proxy.ts;
    // drop any that still slip through so they don't dominate the issue list.
    if (msg.includes("cannot find module './.next/server/pages/")) return null;

    return event;
  },
});
