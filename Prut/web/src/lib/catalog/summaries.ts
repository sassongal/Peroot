import type { CatalogItem } from "@/components/features/catalog/types";
import { CATEGORY_ID_TO_SLUG } from "@/lib/category-slugs";
import { CATEGORY_LABELS } from "@/lib/constants";
import { parseCapabilityMode } from "@/lib/capability-mode";
import { extractVariables } from "@/lib/variable-utils";

/** Enough of the body for search to find a prompt by its content. */
export const CATALOG_PREVIEW_CHARS = 240;

const CATEGORY_KEY_BY_LOWER: Record<string, string> = Object.fromEntries(
  Object.keys(CATEGORY_LABELS).map((k) => [k.toLowerCase(), k]),
);

/** The columns every catalogue page selects. */
export const CATALOG_SELECT =
  "id, title, use_case, prompt, variables, category_id, preview_image_url, capability_mode";

export interface CatalogRow {
  id: string;
  title: string;
  use_case: string | null;
  prompt: string;
  variables: string[] | null;
  category_id: string | null;
  preview_image_url: string | null;
  capability_mode: string | null;
}

function resolveCategory(categoryId: string | null): { key: string; slug: string | null } {
  if (!categoryId) return { key: "General", slug: null };
  const key = CATEGORY_KEY_BY_LOWER[categoryId.toLowerCase()] ?? categoryId;
  const slug =
    CATEGORY_ID_TO_SLUG[key] ??
    CATEGORY_ID_TO_SLUG[categoryId] ??
    Object.entries(CATEGORY_ID_TO_SLUG).find(
      ([k]) => k.toLowerCase() === categoryId.toLowerCase(),
    )?.[1] ??
    null;
  return { key, slug };
}

/**
 * Turn a database row into a catalogue item. Variables are recomputed with the
 * strict tokenizer the fill UI uses, so a card's "N שדות" count matches the
 * panel that opens on the home page, and rows whose only braces are JSON do
 * not pose as templates.
 */
export function toCatalogItem(row: CatalogRow, opts: { preview?: boolean } = {}): CatalogItem {
  const { key, slug } = resolveCategory(row.category_id);
  const variables = extractVariables(row.prompt ?? "");
  const preview = opts.preview === true;
  return {
    id: row.id,
    title: row.title,
    useCase: row.use_case ?? "",
    category: key,
    categorySlug: slug,
    capabilityMode: row.capability_mode ? parseCapabilityMode(row.capability_mode) : null,
    variables,
    text: preview ? (row.prompt ?? "").slice(0, CATALOG_PREVIEW_CHARS) : (row.prompt ?? ""),
    textIsPreview: preview,
    previewImageUrl: row.preview_image_url ?? null,
  };
}
