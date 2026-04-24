import { logger } from "@/lib/logger";

interface ApiKeyValidation {
  valid: boolean;
  userId?: string;
  keyId?: string;
  error?: string;
}

/**
 * Developer API (prk_* keys) is currently DISABLED.
 *
 * Why disabled:
 *  - There is no `developer_api_keys` migration in supabase/migrations/.
 *  - The `/api/developer/keys/*` management route returns 503.
 *  - No UI exists to mint or revoke keys.
 *
 * This stub always returns `{ valid: false }` so that any prk_* token supplied
 * to enhance/other routes is rejected with 401. The `prk_` detection branches
 * are intentionally left in place (proxy.ts, enhance/lib/auth.ts,
 * enhance/route.ts) so re-enabling the feature later is a single-file change
 * here plus the missing migration + UI.
 */
export async function validateApiKey(apiKey: string): Promise<ApiKeyValidation> {
  if (!apiKey.startsWith("prk_")) {
    return { valid: false, error: "Invalid key format" };
  }
  logger.warn("[ApiAuth] Developer API is disabled — rejecting prk_* token");
  return { valid: false, error: "Developer API is currently unavailable" };
}
