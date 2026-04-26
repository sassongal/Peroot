import * as Sentry from "@sentry/nextjs";

/**
 * Wraps an async API route handler with Sentry context.
 * Tags every captured event with the route name and any extra tags.
 *
 * Usage:
 *   export const GET = withSentryRoute("api/prompts", async (req) => { ... });
 */
export function withSentryRoute<T>(
  routeName: string,
  handler: (...args: T[]) => Promise<Response>,
  tags?: Record<string, string>,
): (...args: T[]) => Promise<Response> {
  return async (...args: T[]) => {
    return Sentry.withScope((scope) => {
      scope.setTag("route", routeName);
      if (tags) {
        for (const [k, v] of Object.entries(tags)) scope.setTag(k, v);
      }
      return handler(...args);
    });
  };
}

/**
 * Captures an error with structured context — use in catch blocks where
 * you want richer Sentry context than a bare captureException call.
 */
export function captureRouteError(
  err: unknown,
  context: { route: string; userId?: string; extra?: Record<string, unknown> },
) {
  Sentry.withScope((scope) => {
    scope.setTag("route", context.route);
    if (context.userId) scope.setUser({ id: context.userId });
    if (context.extra) scope.setExtras(context.extra);
    Sentry.captureException(err);
  });
}
