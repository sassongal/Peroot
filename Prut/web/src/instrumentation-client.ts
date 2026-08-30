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
    // AbortError is a DOMException (NOT instanceof Error), so read the message
    // defensively off any object and also fall back to the captured event value.
    const rawMsg =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message?: unknown }).message ?? "")
          : "";
    const eventMsg = event.exception?.values?.map((v) => v.value ?? "").join(" ") ?? "";
    const msg = `${rawMsg} ${eventMsg}`.toLowerCase();
    if (
      msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("load failed") || // Safari network cancel
      msg.includes("the user aborted a request") ||
      msg.includes("signal is aborted") || // Supabase auth-js LockManager on navigation/unmount
      msg.includes("aborted without reason") ||
      msg.includes("resizeobserver loop") ||
      msg.includes("script error") || // Cross-origin, no useful detail
      msg.includes("cancelled") ||
      msg.includes("chunk load error") || // Webpack chunk reload; handled by SW
      // In-app WebView (Facebook/Instagram) bridge failures — their injected
      // navigation_performance_logger throws on postMessage during page close.
      msg.includes("java exception was raised during method invocation")
    ) {
      return null;
    }
    // Drop errors injected by browser extensions or in-app-browser scripts.
    // Our own code is always served from https:// (or webpack-internal in dev);
    // app:// frames belong to WebView-injected loggers (Facebook, TikTok, etc.).
    const frames = event.exception?.values?.[0]?.stacktrace?.frames ?? [];
    if (
      frames.some(
        (f) =>
          f.filename?.includes("chrome-extension://") ||
          f.filename?.includes("moz-extension://") ||
          f.filename?.includes("safari-extension://") ||
          f.filename?.includes("safari-web-extension://") ||
          f.filename?.startsWith("app://"),
      )
    ) {
      return null;
    }
    return event;
  },
});

// Required by @sentry/nextjs v9+ so client-side navigations are instrumented.
// Without this export, App Router route changes produce no transactions.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
