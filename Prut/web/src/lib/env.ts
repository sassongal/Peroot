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
}
