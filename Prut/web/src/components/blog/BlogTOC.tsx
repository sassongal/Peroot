"use client";

import { useEffect, useRef, useState } from "react";

interface TocItem {
  id: string;
  text: string;
}

interface BlogTOCProps {
  content: string;
}

/** Extract H2 headings from raw HTML and derive stable IDs. */
function extractHeadings(html: string): TocItem[] {
  const pattern = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  const items: TocItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    // Strip inner HTML tags to get plain text
    const text = match[1].replace(/<[^>]+>/g, "").trim();
    if (!text) continue;

    // Build a slug: lower-case, replace whitespace/special chars with hyphens
    const id = text
      .replace(/\s+/g, "-")
      .replace(/[^\w\u0590-\u05FF-]/g, "") // keep Hebrew + word chars + hyphens
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

    if (id) items.push({ id, text });
  }

  return items;
}

export function BlogTOC({ content }: BlogTOCProps) {
  const headings = extractHeadings(content);
  const [activeId, setActiveId] = useState<string>("");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      // Find the topmost visible heading
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

      if (visible.length > 0) {
        setActiveId(visible[0].target.id);
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersect, {
      rootMargin: "-80px 0px -60% 0px",
      threshold: 0,
    });

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current!.observe(el);
    });

    return () => {
      observerRef.current?.disconnect();
    };
    // headings derived from static content — no need to re-run on content change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (headings.length < 2) return null;

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
    }
  };

  return (
    <nav
      aria-label="תוכן עניינים"
      dir="rtl"
      className="sticky top-20 w-52 shrink-0 hidden xl:block self-start"
    >
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 px-3">
        תוכן עניינים
      </p>
      <ul className="space-y-1">
        {headings.map(({ id, text }) => {
          const isActive = activeId === id;
          return (
            <li key={id}>
              <button
                onClick={() => handleClick(id)}
                className={[
                  "w-full text-right text-sm px-3 py-1.5 rounded-lg transition-colors leading-snug",
                  "border-r-2",
                  isActive
                    ? "text-amber-400 border-amber-400 bg-amber-500/5"
                    : "text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-600",
                ].join(" ")}
              >
                {text}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
