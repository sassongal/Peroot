import type { SupabaseClient } from "@supabase/supabase-js";
import type { CatalogItem } from "@/components/features/catalog/types";
import { CATALOG_SELECT, toCatalogItem, type CatalogRow } from "./summaries";

// Supabase serves at most 1000 rows per request; page so the templates facet
// always gets the whole catalogue (a .limit(500) once dropped a quarter of it).
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

interface FetchOptions {
  /** Ship a preview of the body instead of the whole text. */
  preview?: boolean;
  /** Only prompts with at least one fillable field. */
  onlyTemplates?: boolean;
  /** Restrict to one category (case-insensitive `category_id`). */
  categoryId?: string;
  /** Hard cap for a single-category page. */
  limit?: number;
}

/**
 * Every active catalogue prompt as `CatalogItem`s, newest first. Throws on a
 * database error so a page can surface the failure instead of an empty grid.
 * Server only: pass the service client (public rows, cookie-free, ISR-safe).
 */
export async function fetchCatalogItems(
  supabase: SupabaseClient,
  { preview = false, onlyTemplates = false, categoryId, limit }: FetchOptions = {},
): Promise<CatalogItem[]> {
  const rows: CatalogRow[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    let q = supabase
      .from("public_library_prompts")
      .select(CATALOG_SELECT)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (categoryId) q = q.ilike("category_id", categoryId.toLowerCase());
    const to = limit ? Math.min(from + PAGE_SIZE - 1, limit - 1) : from + PAGE_SIZE - 1;
    if (to < from) break;
    const { data, error } = await q.range(from, to);
    if (error) throw new Error("library_load_failed");
    if (!data || data.length === 0) break;
    rows.push(...(data as CatalogRow[]));
    if (data.length < PAGE_SIZE || (limit && rows.length >= limit)) break;
  }
  const items = rows.map((r) => toCatalogItem(r, { preview }));
  return onlyTemplates ? items.filter((i) => i.variables.length > 0) : items;
}
