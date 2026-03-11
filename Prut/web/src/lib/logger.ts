/**
 * Structured logger that respects environment.
 * - Development: all levels print to console
 * - Production: info/warn are no-ops, errors go to Sentry
 */

const isDev = process.env.NODE_ENV !== 'production';

function formatArgs(args: unknown[]): string {
  return args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ');
}

export const logger = {
  info(...args: unknown[]) {
    if (isDev) {
      console.log(...args);
    }
    // Production: silent - no log noise
  },

  warn(...args: unknown[]) {
    if (isDev) {
      console.warn(...args);
    }
    // Production: silent
  },

  error(...args: unknown[]) {
    if (isDev) {
      console.error(...args);
    }
    // Production: send to Sentry
    if (!isDev) {
      try {
        // Dynamic import to avoid bundling Sentry in every module
        const message = formatArgs(args);
        const errorObj = args.find(a => a instanceof Error) as Error | undefined;
        import('@sentry/nextjs').then(Sentry => {
          if (errorObj) {
            Sentry.captureException(errorObj, { extra: { context: message } });
          } else {
            Sentry.captureMessage(message, 'error');
          }
        }).catch(() => {
          // Sentry unavailable - last resort
          console.error(...args);
        });
      } catch {
        console.error(...args);
      }
    }
  },
};
