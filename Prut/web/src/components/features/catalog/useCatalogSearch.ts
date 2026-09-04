"use client";

import { useMemo } from "react";
import { hebrewFuzzyMatch, hebrewMatchScore } from "@/lib/hebrew-search";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { CatalogFacet, CatalogItem } from "./types";

interface Options {
  query: string;
  facet: CatalogFacet;
  category: string | null;
}

/**
 * One ranking for every catalogue grid: title counts double, the use case
 * once, the body a quarter, so a typo-tolerant Hebrew search finds a prompt
 * by what it does before what it says. Filters apply before ranking.
 */
export function useCatalogSearch(items: CatalogItem[], { query, facet, category }: Options) {
  const trimmed = query.trim();
  return useMemo(() => {
    let pool = items;
    if (facet === "variables") pool = pool.filter((i) => i.variables.length > 0);
    if (category) pool = pool.filter((i) => i.category === category);
    if (!trimmed) return pool;

    const scored: Array<{ item: CatalogItem; score: number }> = [];
    for (const item of pool) {
      const label = CATEGORY_LABELS[item.category] ?? item.category;
      const haystack = `${item.title} ${item.useCase} ${label} ${item.text}`;
      if (!hebrewFuzzyMatch(haystack, trimmed)) continue;
      scored.push({
        item,
        score:
          hebrewMatchScore(item.title, trimmed) * 2 +
          hebrewMatchScore(item.useCase, trimmed) +
          hebrewMatchScore(item.text, trimmed) * 0.25,
      });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.item);
  }, [items, trimmed, facet, category]);
}
