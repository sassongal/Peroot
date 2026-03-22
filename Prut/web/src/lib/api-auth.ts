import { createServiceClient } from "@/lib/supabase/service";
import { createHash } from "crypto";
import { logger } from "@/lib/logger";

interface ApiKeyValidation {
  valid: boolean;
  userId?: string;
  keyId?: string;
  error?: string;
}

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Validate a developer API key (prk_...) and return the associated user.
 * Uses service role client for cross-user lookup.
 */
export async function validateApiKey(apiKey: string): Promise<ApiKeyValidation> {
  if (!apiKey.startsWith("prk_")) {
    return { valid: false, error: "Invalid key format" };
  }

  const supabase = createServiceClient();

  const keyHash = hashKey(apiKey);

  const { data, error } = await supabase
    .from("developer_api_keys")
    .select("id, user_id, is_active, rate_limit, usage_count, expires_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error || !data) {
    return { valid: false, error: "Invalid API key" };
  }

  if (!data.is_active) {
    return { valid: false, error: "API key has been revoked" };
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, error: "API key has expired" };
  }

  // Update usage stats atomically (fire and forget).
  // NOTE: The Supabase JS client does not support atomic increment natively.
  // We use an RPC call to `increment_api_key_usage` for a race-safe update.
  // If the RPC does not exist, fall back to a non-atomic update with an
  // optimistic lock on the expected usage_count to detect conflicts.
  supabase
    .rpc("increment_api_key_usage", { key_id: data.id })
    .then(({ error: rpcErr }) => {
      if (rpcErr) {
        // RPC not available — fall back to optimistic-lock update.
        // The `.eq("usage_count", data.usage_count)` filter ensures we only
        // update if no concurrent request incremented the counter first.
        // On conflict the update silently becomes a no-op (telemetry loss
        // is acceptable for usage counters).
        supabase
          .from("developer_api_keys")
          .update({
            usage_count: data.usage_count + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq("id", data.id)
          .eq("usage_count", data.usage_count)
          .then(({ error: updateErr }) => {
            if (updateErr) logger.error("[ApiAuth] Failed to update usage:", updateErr);
          });
      }
    });

  return { valid: true, userId: data.user_id, keyId: data.id };
}
