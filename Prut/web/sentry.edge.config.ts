import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",

  // Low sample rate for edge — it runs on every request including middleware
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,

  sendDefaultPii: false,
});
