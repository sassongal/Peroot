import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";

export function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key);
}

export function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.REDIS_TOKEN;
  if (!url || !token) {
    throw new Error("Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN");
  }
  return new Redis({ url, token });
}

export function handleError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return `Error: ${msg}`;
}

export function truncate(text: string, limit = 25_000): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit) + `\n\n[... truncated — ${text.length - limit} chars omitted]`;
}
