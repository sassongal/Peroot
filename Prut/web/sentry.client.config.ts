import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://9e494a4f43eca116d1caa0826b7d4df7@o4510767730196480.ingest.de.sentry.io/4510767735832656",
  
  // Performance Monitoring
  tracesSampleRate: 1.0,
  
  // Security
  sendDefaultPii: true,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",
  
  // Set environment
  environment: process.env.NODE_ENV,
});
