import type { SupabaseClient } from "@supabase/supabase-js";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { LibraryPrompt } from "@/lib/types";

// Supabase serves at most 1000 rows per request; page through the catalog so
// the caller always gets ALL active prompts. A single `.limit(500)` here once
// silently dropped 154 of 654 rows, and the truncated array's length was then
// displayed as the catalog size.
const PAGE_SIZE = 1000;
// Hard ceiling so a runaway catalog (or a broken is_active filter) can't loop
// forever: 20 pages = 20k prompts, far beyond any realistic catalog size.
const MAX_PAGES = 20;

const categoryKeyMap = Object.fromEntries(
  Object.keys(CATEGORY_LABELS).map((k) => [k.toLowerCase(), k]),
);

/**
 * Fetch every active public library prompt, newest first, with `category`
 * normalized to the CATEGORY_LABELS key casing the frontend expects.
 * Throws on database error — callers decide how to surface the failure.
 */
export async function fetchAllActiveLibraryPrompts(
  supabase: SupabaseClient,
): Promise<LibraryPrompt[]> {
  const rows: Record<string, unknown>[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from("public_library_prompts")
      .select("*, source:source_metadata")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error("library_load_failed");
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  return rows.map(({ category_id, ...rest }) => ({
    ...rest,
    category:
      (typeof category_id === "string" && categoryKeyMap[category_id.toLowerCase()]) || "General",
  })) as LibraryPrompt[];
}
