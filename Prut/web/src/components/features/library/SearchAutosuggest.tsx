"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { hebrewFuzzyMatch, hebrewMatchScore } from "@/lib/hebrew-search";
import { CATEGORY_LABELS } from "@/lib/constants";

interface SuggestItem {
  type: "category" | "prompt";
  label: string;
  value: string;
}

interface SearchAutosuggestProps {
  value: string;
  onChange: (value: string) => void;
  prompts: { id: string; title: string; category: string; use_case?: string }[];
  placeholder?: string;
  className?: string;
}

export function SearchAutosuggest({
  value,
  onChange,
  prompts,
  placeholder = "חיפוש פרומפטים...",
  className,
}: SearchAutosuggestProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [debouncedQuery, setDebouncedQuery] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounce query for suggestions
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(value), 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value]);

  // Build suggestions
  const suggestions: SuggestItem[] = (() => {
    const q = debouncedQuery.trim();
    if (q.length < 2) return [];

    const items: SuggestItem[] = [];

    // Category matches (max 3)
    const categoryEntries = Object.entries(CATEGORY_LABELS);
    const matchedCategories = categoryEntries
      .filter(([, label]) => hebrewFuzzyMatch(label, q))
      .sort((a, b) => hebrewMatchScore(b[1], q) - hebrewMatchScore(a[1], q))
      .slice(0, 3);

    matchedCategories.forEach(([key, label]) => {
      items.push({ type: "category", label, value: label });
    });

    // Prompt title matches (max 5)
    const matchedPrompts = prompts
      .map(p => ({
        ...p,
        score: Math.max(
          hebrewMatchScore(p.title, q),
          hebrewMatchScore(p.use_case || "", q)
        ),
      }))
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    matchedPrompts.forEach(p => {
      items.push({ type: "prompt", label: p.title, value: p.title });
    });

    return items;
  })();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const item = suggestions[activeIndex];
      onChange(item.value);
      setShowSuggestions(false);
      setActiveIndex(-1);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  }, [showSuggestions, suggestions, activeIndex, onChange]);

  const handleSelect = (item: SuggestItem) => {
    onChange(item.value);
    setShowSuggestions(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted)" />
      <input
        ref={inputRef}
        dir="rtl"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
          setActiveIndex(-1);
        }}
        onFocus={() => value.trim().length >= 2 && setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full bg-black/5 dark:bg-black/30 border border-(--glass-border) rounded-lg py-2.5 pe-10 ps-8 text-base md:text-sm text-(--text-primary) placeholder:text-slate-600 focus:outline-none focus:border-(--glass-border)"
        role="combobox"
        aria-expanded={showSuggestions && suggestions.length > 0}
        aria-autocomplete="list"
      />
      {value && (
        <button
          type="button"
          onClick={() => { onChange(""); setShowSuggestions(false); }}
          className="absolute end-3 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-white/10 text-(--text-muted) hover:text-(--text-primary) transition-colors"
          aria-label="נקה חיפוש"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          className="absolute top-full mt-1 inset-x-0 z-50 bg-[#111] border border-(--glass-border) rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
          role="listbox"
          dir="rtl"
        >
          {/* Category section */}
          {suggestions.some(s => s.type === "category") && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-medium text-(--text-muted) uppercase tracking-wider">
                קטגוריות
              </div>
              {suggestions.filter(s => s.type === "category").map((item, i) => {
                const globalIdx = suggestions.indexOf(item);
                return (
                  <button
                    key={`cat-${item.value}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setActiveIndex(globalIdx)}
                    className={cn(
                      "w-full text-right px-3 py-2 text-sm transition-colors",
                      globalIdx === activeIndex ? "bg-white/10 text-(--text-primary)" : "text-(--text-secondary) hover:bg-white/5"
                    )}
                    role="option"
                    aria-selected={globalIdx === activeIndex}
                  >
                    {item.label}
                  </button>
                );
              })}
            </>
          )}

          {/* Prompt section */}
          {suggestions.some(s => s.type === "prompt") && (
            <>
              <div className={cn(
                "px-3 py-1.5 text-[10px] font-medium text-(--text-muted) uppercase tracking-wider",
                suggestions.some(s => s.type === "category") && "border-t border-(--glass-border)"
              )}>
                פרומפטים
              </div>
              {suggestions.filter(s => s.type === "prompt").map((item) => {
                const globalIdx = suggestions.indexOf(item);
                return (
                  <button
                    key={`prompt-${item.value}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setActiveIndex(globalIdx)}
                    className={cn(
                      "w-full text-right px-3 py-2 text-sm transition-colors truncate",
                      globalIdx === activeIndex ? "bg-white/10 text-(--text-primary)" : "text-(--text-secondary) hover:bg-white/5"
                    )}
                    role="option"
                    aria-selected={globalIdx === activeIndex}
                  >
                    {item.label}
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
