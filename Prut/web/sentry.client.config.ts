import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://9e494a4f43eca116d1caa0826b7d4df7@o4510767730196480.ingest.de.sentry.io/4510767735832656",

  // Performance Monitoring — reduced from 0.25 to save API quota and reduce overhead
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Security - avoid capturing user emails/PII in error reports
  sendDefaultPii: false,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Set environment
  environment: process.env.NODE_ENV,

  // Lazy load integrations to reduce initial bundle size (~500KB -> ~50KB)
  integrations: (defaults) => defaults.filter(i => i.name !== 'BrowserTracing'),

  // Pass events through unmodified
  beforeSend(event) {
    return event;
  },
});

// Lazy load performance monitoring after page is interactive
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      import('@sentry/nextjs').then(({ browserTracingIntegration }) => {
        Sentry.addIntegration(browserTracingIntegration());
      });
    }, 3000);
  }, { once: true });
}
