"use client";

import { useState, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/constants";
import { CATEGORY_ID_TO_SLUG } from "@/lib/category-slugs";
import { getApiPath } from "@/lib/api-path";

interface SearchResult {
  id: string;
  title: string;
  category_id: string;
  use_case: string | null;
  variables: string[];
  capability_mode: string;
}

export function PromptSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(getApiPath(`/api/library/search?q=${encodeURIComponent(q.trim())}&limit=12`));
      if (res.ok) {
        const data = await res.json();
        setResults(Array.isArray(data) ? data : data.prompts || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const debouncedSearch = useCallback((value: string) => {
    setQuery(value);
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => handleSearch(value), 300);
    setTimer(t);
  }, [timer, handleSearch]);

  const clear = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
  };

  return (
    <div className="w-full mb-8">
      {/* Search input */}
      <div className="relative max-w-xl">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => debouncedSearch(e.target.value)}
          placeholder="חפשו פרומפט... (למשל: מבחן מתמטיקה, תכנון שיעור)"
          className="w-full ps-10 pe-10 py-3 rounded-xl border border-border bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors"
          dir="rtl"
        />
        {query && (
          <button
            onClick={clear}
            aria-label="נקה חיפוש"
            className="absolute end-3 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results */}
      {loading && (
        <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>מחפש...</span>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="mt-4 p-4 rounded-xl border border-border bg-secondary text-center">
          <p className="text-sm text-muted-foreground">
            לא מצאנו פרומפטים ל-&quot;{query}&quot;. נסו מילים אחרות.
          </p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted-foreground mb-2">
            נמצאו {results.length} תוצאות:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {results.map((result) => {
              const categorySlug = CATEGORY_ID_TO_SLUG[result.category_id] || "general";
              const categoryLabel = CATEGORY_LABELS[result.category_id] || result.category_id;

              return (
                <Link
                  key={result.id}
                  href={`/prompts/${categorySlug}`}
                  className={cn(
                    "flex flex-col gap-1.5 p-3 rounded-xl border border-border bg-secondary",
                    "hover:bg-white/[0.06] hover:border-amber-500/30 transition-all group"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                      {categoryLabel}
                    </span>
                  </div>
                  <h4 className="text-sm font-medium text-foreground group-hover:text-amber-400 transition-colors">
                    {result.title}
                  </h4>
                  {result.use_case && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {result.use_case}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
