import * as Sentry from "@sentry/nextjs";
import { validateEnv } from "@/lib/env";

/**
 * Next.js calls this once per runtime on boot.
 *
 * The `sentry.{server,edge}.config.ts` files are NOT auto-loaded by
 * @sentry/nextjs v9+ — they only run if imported here. Before this, all three
 * Sentry configs were dead files and the project reported 0 events for months.
 */
export async function register() {
  validateEnv();

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

/**
 * Captures errors thrown inside React Server Components / route handlers, which
 * Next.js surfaces through this hook rather than as unhandled exceptions.
 */
export const onRequestError = Sentry.captureRequestError;
