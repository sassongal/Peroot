import { createClient } from "@supabase/supabase-js";
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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

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

  // Update usage stats (fire and forget)
  supabase
    .from("developer_api_keys")
    .update({
      usage_count: data.usage_count + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", data.id)
    .then(({ error: updateErr }) => {
      if (updateErr) logger.error("[ApiAuth] Failed to update usage:", updateErr);
    });

  return { valid: true, userId: data.user_id, keyId: data.id };
}
