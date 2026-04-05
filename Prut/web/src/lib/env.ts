/**
 * Runtime validation of required environment variables.
 * Import this in middleware or layout to catch misconfigurations early.
 */

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

const serverRequired = [
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

// Warn but don't crash — optional services or vars not available at build time
const serverOptional = [
  'CRON_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'RESEND_API_KEY',
  'LEMONSQUEEZY_WEBHOOK_SECRET',
  'SENTRY_DSN',
  'MISTRAL_API_KEY',
] as const;

export function validateEnv() {
  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) missing.push(key);
  }

  // Only check server vars in server context
  if (typeof window === 'undefined') {
    for (const key of serverRequired) {
      if (!process.env[key]) missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(k => `  - ${k}`).join('\n')}`
    );
  }

  // Warn about optional but recommended vars
  if (typeof window === 'undefined') {
    const optionalMissing = serverOptional.filter(k => !process.env[k]);
    if (optionalMissing.length > 0) {
      console.warn(
        `[env] Missing optional environment variables (features may be degraded):\n${optionalMissing.map(k => `  - ${k}`).join('\n')}`
      );
    }
  }
}
