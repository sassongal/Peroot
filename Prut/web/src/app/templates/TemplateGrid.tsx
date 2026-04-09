"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Crown, Variable } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LibraryPrompt } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/constants";
import { CapabilityMode } from "@/lib/capability-mode";
import { setPendingPrompt } from "@/lib/pending-prompt";

interface TemplateGridProps {
  templates: LibraryPrompt[];
}

/** Extract {variable} placeholders from a prompt string */
function extractPlaceholders(text: string): string[] {
  const matches = text.match(/{[^}]+}/g) || [];
  const unique = new Set(
    matches.map((m) => m.replace(/[{}]/g, "").trim())
  );
  return Array.from(unique).filter(Boolean);
}

/** Group templates by category and return sorted groups */
function groupByCategory(templates: LibraryPrompt[]) {
  const groups: Record<string, LibraryPrompt[]> = {};
  for (const t of templates) {
    const cat = t.category || "General";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(t);
  }
  // Sort by group size descending
  return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
}

export function TemplateGrid({ templates }: TemplateGridProps) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const handleUseTemplate = (template: LibraryPrompt) => {
    setPendingPrompt({
      id: template.id,
      title: template.title,
      prompt: template.prompt,
      category: template.category,
      is_template: true,
      source: "templates",
    });
    router.push("/?ref=templates");
  };

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of templates) {
      const cat = t.category || "General";
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => ({ id, label: CATEGORY_LABELS[id] || id, count }));
  }, [templates]);

  const filtered = useMemo(
    () =>
      activeCategory
        ? templates.filter((t) => (t.category || "General") === activeCategory)
        : templates,
    [templates, activeCategory]
  );

  const grouped = useMemo(() => groupByCategory(filtered), [filtered]);

  return (
    <>
      {/* Category filter chips */}
      <div className="mb-10 -mx-4 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 pb-2 min-w-max">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              "px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium border transition-all whitespace-nowrap min-h-[36px]",
              !activeCategory
                ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400"
                : "border-border text-muted-foreground hover:text-foreground hover:border-amber-500/20 hover:bg-amber-500/5"
            )}
          >
            הכל ({templates.length})
          </button>
          {categories.map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() =>
                setActiveCategory(activeCategory === id ? null : id)
              }
              className={cn(
                "px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium border transition-all whitespace-nowrap min-h-[36px]",
                activeCategory === id
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-amber-500/20 hover:bg-amber-500/5"
              )}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Template groups */}
      <div className="space-y-12">
        {grouped.map(([category, items]) => (
          <section key={category} aria-label={CATEGORY_LABELS[category] || category}>
            {/* Show section header only when showing all categories */}
            {!activeCategory && (
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
                <h2 className="text-lg md:text-xl font-serif text-foreground">
                  {CATEGORY_LABELS[category] || category}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {items.length} תבניות
                </span>
              </div>
            )}

            {/* Cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((template) => {
                const placeholders = extractPlaceholders(template.prompt);
                const isAdvanced =
                  template.capability_mode &&
                  template.capability_mode !== CapabilityMode.STANDARD;

                return (
                  <article
                    key={template.id}
                    className="group relative flex flex-col rounded-xl border border-border bg-card hover:border-amber-500/30 hover:shadow-[0_0_24px_rgba(245,158,11,0.06)] transition-all duration-200 overflow-hidden"
                  >
                    <div className="flex-1 p-5">
                      {/* Header: title + badges */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-sm font-bold text-foreground leading-snug group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2">
                          {template.title}
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isAdvanced && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-400 select-none">
                              <Crown className="w-2.5 h-2.5" />
                              Pro
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Category badge */}
                      <span className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-md bg-secondary text-muted-foreground mb-3">
                        {CATEGORY_LABELS[template.category] || template.category}
                      </span>

                      {/* Use case / description */}
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                        {template.use_case}
                      </p>

                      {/* Variable count */}
                      {placeholders.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Variable className="w-3.5 h-3.5" />
                          <span>{placeholders.length} משתנים</span>
                        </div>
                      )}
                    </div>

                    {/* Footer: Use button */}
                    <div className="px-5 pb-4 pt-1">
                      <button
                        type="button"
                        onClick={() => handleUseTemplate(template)}
                        className="flex items-center justify-center w-full py-2.5 rounded-lg text-sm font-bold transition-all border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none cursor-pointer"
                      >
                        השתמש בתבנית
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              לא נמצאו תבניות בקטגוריה זו
            </p>
          </div>
        )}
      </div>
    </>
  );
}
