import type { CapabilityMode } from "@/lib/capability-mode";

/**
 * One prompt as the public catalogue renders it, whichever page shows it.
 *
 * The catalogue has one table (`public_library_prompts`) and used to have
 * three presentations of it: an in-app library view (removed 2026-08-31),
 * the category pages under /prompts and the /templates grid, each with its
 * own card, search and "use" flow. This shape is what all of them ship now.
 *
 * `text` is either the whole prompt (category pages, at most a few dozen
 * items) or a preview (the templates facet, hundreds of items, so the page
 * stays light). `textIsPreview` tells the card to read the body on "use".
 */
export interface CatalogItem {
  id: string;
  title: string;
  useCase: string;
  /** CATEGORY_LABELS key casing, e.g. "Marketing". */
  category: string;
  /** English URL slug of the category, when known (drives the detail link). */
  categorySlug: string | null;
  capabilityMode: CapabilityMode | null;
  variables: string[];
  text: string;
  textIsPreview: boolean;
  previewImageUrl: string | null;
}

/** Which slice of the catalogue a grid shows. */
export type CatalogFacet = "all" | "variables";

/** Where a catalogue action came from, for the usage event's `source`. */
export type CatalogSource = "catalog_category" | "catalog_index" | "catalog_detail" | "templates";
