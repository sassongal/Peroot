import { createClient, SupabaseClientOptions } from "@supabase/supabase-js";

/**
 * Create a Supabase client with service-role privileges.
 * Bypasses RLS — use only in server-side code (API routes, cron jobs, webhooks).
 */
export function createServiceClient(options?: SupabaseClientOptions<"public">) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "createServiceClient: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars"
    );
  }
  return createClient(url, key, options);
}
