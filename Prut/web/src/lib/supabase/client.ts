
import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'
import { logger } from "@/lib/logger"

let client: SupabaseClient | null = null;

export function createClient() {
  if (client) return client;

  logger.info("[Supabase Client] Initializing createBrowserClient...");
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return client;
}
