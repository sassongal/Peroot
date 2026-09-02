"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Jump-nav for the catalogue index.
 *
 * 31 categories are grouped into six sections, so finding one meant scrolling
 * past all of them. The row that sat here before was a single chip labelled
 * "סינון:" that did not filter anything — it was a link to /templates dressed
 * as a filter control, which is worse than no filter: it teaches the user that
 * controls on this page do not do what they say.
 *
 * This is an honest control: each chip scrolls to a real section, and the
 * active chip tracks what is actually on screen.
 */
export interface QuickNavSection {
  id: string;
  title: string;
  count: number;
}

export function CategoryQuickNav({ sections }: { sections: QuickNavSection[] }) {
  const [active, setActive] = useState<string | null>(sections[0]?.id ?? null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        // The topmost section currently intersecting wins, so the active chip
        // matches what the reader is actually looking at rather than the last
        // one to cross the line.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -55% 0px", threshold: 0 },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  };

  return (
    <nav
      dir="rtl"
      aria-label="מעבר מהיר לקבוצת קטגוריות"
      className="sticky top-0 z-20 -mx-4 px-4 py-3 mb-10 bg-(--surface-rail) backdrop-blur-md border-b border-(--glass-border)"
    >
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => jump(s.id)}
            aria-current={active === s.id ? "true" : undefined}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 px-3 min-h-[44px] rounded-lg border text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
              active === s.id
                ? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300"
                : "border-(--glass-border) text-(--text-muted) hover:text-(--text-primary) hover:bg-(--glass-bg)",
            )}
          >
            <span>{s.title}</span>
            <span className="tabular-nums opacity-60">{s.count}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
