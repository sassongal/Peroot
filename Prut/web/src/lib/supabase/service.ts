import { createClient, SupabaseClientOptions } from "@supabase/supabase-js";

/**
 * Create a Supabase client with service-role privileges.
 * Bypasses RLS — use only in server-side code (API routes, cron jobs, webhooks).
 */
export function createServiceClient(options?: SupabaseClientOptions<"public">) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    options
  );
}
