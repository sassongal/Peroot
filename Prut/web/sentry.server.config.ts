// On Cloudflare Workers, the @sentry/nextjs Node SDK is too heavy and pulls in
// ~3-5 MiB of server bundle (OpenTelemetry, agent runtime). Disable when building
// for Cloudflare. Client-side Sentry is unaffected (sentry.client.config.ts).
const isCloudflareBuild =
  process.env.NEXT_RUNTIME === "edge" ||
  process.env.CF_PAGES === "1" ||
  process.env.CLOUDFLARE_WORKERS === "1";

if (!isCloudflareBuild) {
  // Lazy-import so the entire Sentry Node SDK is excluded from CF bundle
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sentry = require("@sentry/nextjs");

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    enabled: process.env.NODE_ENV === "production",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    integrations: [Sentry.captureConsoleIntegration({ levels: ["error"] })],
    sendDefaultPii: false,
    beforeSend(event: unknown, hint: { originalException?: unknown }) {
      const err = hint?.originalException;
      if (err instanceof Error) {
        const msg = err.message?.toLowerCase() ?? "";
        if (msg.includes("jwt expired") || msg.includes("invalid refresh token")) return null;
        if (msg.includes("the operation was aborted") || msg.includes("socket hang up"))
          return null;
      }
      return event;
    },
  });
}
