"use client";

import { useMemo, useState } from "react";
import { Search, Variable, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/constants";
import { CatalogCard } from "./CatalogCard";
import { useCatalogSearch } from "./useCatalogSearch";
import type { CatalogFacet, CatalogItem, CatalogSource } from "./types";

/** Cards in the first render and in each "הצג עוד" step. */
const PAGE_SIZE = 60;

interface CatalogGridProps {
  items: CatalogItem[];
  source: CatalogSource;
  /** Start on this facet. "variables" on /templates, "all" on a category page. */
  initialFacet?: CatalogFacet;
  /** Offer the "רק עם שדות למילוי" switch. Off on /templates, where it is the page. */
  facetToggle?: boolean;
  /** Category chips above the grid (the templates facet spans every category). */
  categoryChips?: boolean;
  /** Group the grid by category when nothing is filtered. */
  groupByCategory?: boolean;
  /** What to call the items in counts: "תבניות" or "פרומפטים". */
  noun?: string;
  searchPlaceholder?: string;
}

const CHIP =
  "px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium border transition-all whitespace-nowrap min-h-[36px] cursor-pointer";
const CHIP_ON = "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300";
const CHIP_OFF =
  "border-border text-muted-foreground hover:text-foreground hover:border-amber-500/20 hover:bg-amber-500/5";

/**
 * The one catalogue grid: search, optional category chips, the templates
 * facet, paging, one card. /prompts/[category] and /templates are both this
 * component with different props, so a fix lands on every page at once.
 */
export function CatalogGrid({
  items,
  source,
  initialFacet = "all",
  facetToggle = true,
  categoryChips = false,
  groupByCategory = false,
  noun = "פרומפטים",
  searchPlaceholder = "חפשו לפי כותרת, נושא או מילת מפתח",
}: CatalogGridProps) {
  const [query, setQuery] = useState("");
  const [facet, setFacet] = useState<CatalogFacet>(initialFacet);
  const [category, setCategory] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [busyId, setBusyId] = useState<string | null>(null);
  const trimmed = query.trim();
  const isSearching = trimmed.length > 0;

  const filtered = useCatalogSearch(items, { query, facet, category });

  // Any filter change starts from the first page again.
  const changeQuery = (q: string) => {
    setQuery(q);
    setVisible(PAGE_SIZE);
  };
  const changeFacet = (f: CatalogFacet) => {
    setFacet(f);
    setVisible(PAGE_SIZE);
  };
  const changeCategory = (c: string | null) => {
    setCategory(c);
    setVisible(PAGE_SIZE);
  };

  const templateCount = useMemo(() => items.filter((i) => i.variables.length > 0).length, [items]);

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const i of items) {
      if (facet === "variables" && i.variables.length === 0) continue;
      counts[i.category] = (counts[i.category] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => ({ id, label: CATEGORY_LABELS[id] ?? id, count }));
  }, [items, facet]);

  // Grouping only when the list is the whole facet: a search is a ranked
  // list, and a chosen category is one section anyway.
  const groups = useMemo<
    Array<{ key: string; label: string | null; items: CatalogItem[]; total: number }>
  >(() => {
    const slice = filtered.slice(0, visible);
    if (!groupByCategory || isSearching || category) {
      return [{ key: "__all__", label: null, items: slice, total: filtered.length }];
    }
    const byCat = new Map<string, CatalogItem[]>();
    for (const i of filtered) {
      const list = byCat.get(i.category) ?? [];
      list.push(i);
      byCat.set(i.category, list);
    }
    const ordered = [...byCat.entries()].sort((a, b) => b[1].length - a[1].length);
    const out: Array<{ key: string; label: string | null; items: CatalogItem[]; total: number }> =
      [];
    let left = visible;
    for (const [key, list] of ordered) {
      if (left <= 0) break;
      const part = list.length > left ? list.slice(0, left) : list;
      out.push({ key, label: CATEGORY_LABELS[key] ?? key, items: part, total: list.length });
      left -= part.length;
    }
    return out;
  }, [filtered, visible, groupByCategory, isSearching, category]);

  const hasMore = visible < filtered.length;

  return (
    <div dir="rtl">
      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => changeQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") changeQuery("");
            }}
            placeholder={searchPlaceholder}
            aria-label={`חיפוש ${noun}`}
            className="w-full min-h-[44px] pr-10 pl-10 rounded-full border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => changeQuery("")}
              aria-label="נקה חיפוש"
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Facet + category chips */}
      {(facetToggle || categoryChips) && (
        <div className="mb-8 -mx-4 px-4 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 pb-2 min-w-max">
            {facetToggle && templateCount > 0 && templateCount < items.length && (
              <>
                <button
                  type="button"
                  onClick={() => changeFacet(facet === "variables" ? "all" : "variables")}
                  aria-pressed={facet === "variables"}
                  className={cn(
                    CHIP,
                    "inline-flex items-center gap-1.5",
                    facet === "variables" ? CHIP_ON : CHIP_OFF,
                  )}
                >
                  <Variable className="w-3.5 h-3.5" aria-hidden="true" />
                  רק עם שדות למילוי ({templateCount})
                </button>
                {categoryChips && <span aria-hidden className="h-5 w-px bg-border mx-1" />}
              </>
            )}
            {categoryChips && (
              <>
                <button
                  type="button"
                  onClick={() => changeCategory(null)}
                  aria-pressed={category === null}
                  className={cn(CHIP, category === null ? CHIP_ON : CHIP_OFF)}
                >
                  הכל (
                  {isSearching
                    ? filtered.length
                    : facet === "variables"
                      ? templateCount
                      : items.length}
                  )
                </button>
                {categories.map(({ id, label, count }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => changeCategory(category === id ? null : id)}
                    aria-pressed={category === id}
                    className={cn(CHIP, category === id ? CHIP_ON : CHIP_OFF)}
                  >
                    {label} ({count})
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Search results header */}
      {isSearching && filtered.length > 0 && (
        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
          <h2 className="text-lg md:text-xl font-serif text-foreground">תוצאות חיפוש</h2>
          <span className="text-xs text-muted-foreground" aria-live="polite" aria-atomic="true">
            {filtered.length} תוצאות עבור &quot;{trimmed}&quot;
          </span>
        </div>
      )}

      {/* Groups */}
      <div className="space-y-12">
        {groups.map((g) => (
          <section key={g.key} aria-label={g.label ?? noun}>
            {g.label && (
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
                <h2 className="text-lg md:text-xl font-serif text-foreground">{g.label}</h2>
                <span className="text-xs text-muted-foreground">
                  {g.total} {noun}
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {g.items.map((item) => (
                <CatalogCard
                  key={item.id}
                  item={item}
                  source={source}
                  showCategory={categoryChips && !category}
                  busyId={busyId}
                  onBusy={setBusyId}
                />
              ))}
            </div>
          </section>
        ))}

        {hasMore && (
          <div className="flex flex-col items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="px-6 py-2.5 rounded-full border border-border text-sm font-medium text-secondary-foreground hover:border-amber-500/40 hover:text-foreground hover:bg-amber-500/5 transition-colors min-h-[44px] cursor-pointer"
            >
              הצג עוד {noun}
            </button>
            <span className="text-xs text-muted-foreground" aria-live="polite">
              מוצגים {Math.min(visible, filtered.length)} מתוך {filtered.length}
            </span>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-16" role="status" aria-live="polite">
            <p className="text-muted-foreground text-lg">
              {isSearching ? `לא נמצאו ${noun} עבור "${trimmed}"` : `אין ${noun} להצגה`}
            </p>
            {(isSearching || category || facet !== initialFacet) && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory(null);
                  setFacet(initialFacet);
                  setVisible(PAGE_SIZE);
                }}
                className="mt-4 text-sm text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
              >
                נקו את הסינון
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
