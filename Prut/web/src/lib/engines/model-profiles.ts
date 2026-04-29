import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import type { ModelProfile, ModelProfileSlug } from "./types";

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  value: ModelProfile | null;
  ts: number;
}
const singleCache = new Map<ModelProfileSlug, CacheEntry>();
let activeListCache: { value: ModelProfile[]; ts: number } | null = null;

interface RowShape {
  slug: string;
  display_name: string;
  display_name_he: string;
  host_match: string[];
  system_prompt_he: string;
  output_format_rules: Record<string, unknown>;
  dimension_weights: Record<string, number>;
  is_active: boolean;
  sort_order: number;
}

function rowToProfile(row: RowShape): ModelProfile {
  return {
    slug: row.slug,
    displayName: row.display_name,
    displayNameHe: row.display_name_he,
    hostMatch: row.host_match ?? [],
    systemPromptHe: row.system_prompt_he,
    outputFormatRules: row.output_format_rules ?? {},
    dimensionWeights: row.dimension_weights ?? {},
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

/** Look up a single profile by slug. Returns null on miss or DB failure. */
export async function getModelProfile(slug: ModelProfileSlug): Promise<ModelProfile | null> {
  const hit = singleCache.get(slug);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.value;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("model_profiles")
      .select(
        "slug,display_name,display_name_he,host_match,system_prompt_he,output_format_rules,dimension_weights,is_active,sort_order",
      )
      .eq("slug", slug)
      .maybeSingle();
    if (error) {
      // Don't poison-cache transient DB errors with the full 5-min TTL —
      // a single hiccup would mask the slug for every subsequent request.
      // Return null without caching; next call retries.
      logger.warn("[model-profiles] load failed", { slug, error: error.message });
      return null;
    }
    const profile = data ? rowToProfile(data as RowShape) : null;
    // A confirmed `null` result (row genuinely not present) is fine to cache —
    // it prevents repeated DB hits for an unknown slug.
    singleCache.set(slug, { value: profile, ts: Date.now() });
    return profile;
  } catch (err) {
    logger.warn("[model-profiles] load threw", { slug, err: (err as Error).message });
    return null;
  }
}

/** All active profiles, ordered by sort_order. */
export async function getActiveModelProfiles(): Promise<ModelProfile[]> {
  if (activeListCache && Date.now() - activeListCache.ts < CACHE_TTL_MS)
    return activeListCache.value;
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("model_profiles")
      .select(
        "slug,display_name,display_name_he,host_match,system_prompt_he,output_format_rules,dimension_weights,is_active,sort_order",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) {
      logger.warn("[model-profiles] list failed", { error: error.message });
      return [];
    }
    const list = ((data ?? []) as RowShape[]).map(rowToProfile);
    activeListCache = { value: list, ts: Date.now() };
    return list;
  } catch (err) {
    logger.warn("[model-profiles] list threw", { err: (err as Error).message });
    return [];
  }
}

/** @internal Test-only. */
export function __resetCacheForTest(): void {
  singleCache.clear();
  activeListCache = null;
}
