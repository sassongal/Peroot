import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";
import {
  API_KEY_DISPLAY_PREFIX_LEN,
  API_KEY_PATTERN,
  hashApiKey,
  hashesEqual,
} from "@/lib/api-keys";

interface ApiKeyValidation {
  valid: boolean;
  userId?: string;
  keyId?: string;
  error?: string;
}

interface KeyRow {
  id: string;
  user_id: string;
  key_hash: string;
  is_active: boolean;
  expires_at: string | null;
}

/**
 * Minimal query surface validateApiKey needs — injectable for unit tests.
 * The production default is the service-role client: the caller is
 * unauthenticated (the key IS the credential), so RLS has no auth.uid() and
 * the lookup must run privileged. The resolved user_id then scopes everything
 * downstream.
 */
export interface ApiKeyDb {
  from(table: "developer_api_keys"): {
    select(cols: string): {
      eq(
        col: string,
        val: string | boolean,
      ): {
        eq(col: string, val: string | boolean): Promise<{ data: KeyRow[] | null; error: unknown }>;
      };
    };
    update(values: Record<string, unknown>): {
      eq(col: string, val: string): PromiseLike<{ error: unknown }>;
    };
  };
}

/**
 * Validates a `prk_live_*` developer API key (Peroot Connect).
 *
 * Flow: strict format check → indexed lookup by key_prefix (active rows only)
 * → constant-time SHA-256 comparison against EVERY prefix match (collisions
 * must not leak timing) → expiry check → fire-and-forget last_used/usage_count
 * update. Never logs key material.
 */
export async function validateApiKey(
  apiKey: string,
  db: ApiKeyDb = createServiceClient() as unknown as ApiKeyDb,
): Promise<ApiKeyValidation> {
  if (!API_KEY_PATTERN.test(apiKey)) {
    return { valid: false, error: "Invalid key format" };
  }

  const prefix = apiKey.slice(0, API_KEY_DISPLAY_PREFIX_LEN);
  const suppliedHash = hashApiKey(apiKey);

  const { data: rows, error } = await db
    .from("developer_api_keys")
    .select("id, user_id, key_hash, is_active, expires_at")
    .eq("key_prefix", prefix)
    .eq("is_active", true);

  if (error) {
    logger.error("[ApiAuth] Key lookup failed:", error);
    // Fail closed but as a server error, not "bad key" — the caller's key may be fine.
    return { valid: false, error: "Key validation unavailable" };
  }

  // Compare against every prefix match in constant time; no early exit on mismatch.
  let matched: KeyRow | null = null;
  for (const row of rows ?? []) {
    if (hashesEqual(row.key_hash, suppliedHash)) {
      matched = row;
    }
  }

  if (!matched) {
    return { valid: false, error: "Invalid API key" };
  }
  if (matched.expires_at && new Date(matched.expires_at).getTime() <= Date.now()) {
    return { valid: false, error: "API key expired" };
  }

  // Best-effort usage stamp — never blocks or fails the request.
  const keyId = matched.id;
  void Promise.resolve(
    db
      .from("developer_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyId),
  ).then(
    (res) => {
      if (res && (res as { error?: unknown }).error) {
        logger.warn("[ApiAuth] last_used update failed:", (res as { error?: unknown }).error);
      }
    },
    () => {
      /* fire-and-forget */
    },
  );

  return { valid: true, userId: matched.user_id, keyId };
}
