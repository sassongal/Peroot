"use client";

import { useId, useMemo, useState } from "react";
import { MessageCircle, Search, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FAQ_ITEMS } from "@/lib/faq-data";

type FAQBubbleProps = {
  mode?: "fixed" | "inline";
};

export function FAQBubble({ mode = "fixed" }: FAQBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("הכל");
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const panelId = useId();
  const headingId = useId();

  const categories = useMemo(() => {
    const items = Array.from(new Set(FAQ_ITEMS.map((item) => item.category)));
    return ["הכל", ...items];
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return FAQ_ITEMS.filter((item) => {
      const categoryMatch = activeCategory === "הכל" || item.category === activeCategory;
      if (!categoryMatch) return false;
      if (!normalized) return true;
      return (
        item.question.toLowerCase().includes(normalized) ||
        item.answer.toLowerCase().includes(normalized)
      );
    });
  }, [activeCategory, query]);

  const panelClass =
    mode === "inline"
      ? "absolute bottom-16 right-0"
      : "fixed bottom-24 right-6";

  return (
    <div className={cn("flex flex-col items-end gap-3", mode === "inline" ? "relative" : "z-[9999]")}>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headingId}
        aria-hidden={!isOpen}
        className={cn(
          panelClass,
          "w-[360px] md:w-[420px] max-h-[70vh] rounded-3xl border border-white/10 bg-black/90 backdrop-blur-2xl shadow-2xl overflow-hidden transition-all duration-300",
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
        dir="rtl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-widest">FAQ</div>
            <h3 id={headingId} className="text-lg text-white font-serif">
              שאלות נפוצות
            </h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-full border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="סגור שאלות נפוצות"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="relative">
            <Search
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש מהיר..."
              aria-label="חיפוש שאלות נפוצות"
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pr-10 pl-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/20"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  setActiveCategory(category);
                  setOpenIndex(0);
                }}
                aria-pressed={activeCategory === category}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors",
                  activeCategory === category
                    ? "bg-white text-black border-white"
                    : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pb-5 space-y-3 overflow-y-auto max-h-[45vh]">
          {filtered.map((item, index) => {
            const isItemOpen = openIndex === index;
            const answerId = `faq-answer-${index}`;
            return (
              <div
                key={`${item.category}-${item.question}`}
                className={cn(
                  "rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden transition-all",
                  isItemOpen && "border-white/20 bg-white/[0.06]"
                )}
              >
                <button
                  onClick={() => setOpenIndex(isItemOpen ? null : index)}
                  className="w-full flex items-center justify-between px-4 py-3 text-right"
                  aria-expanded={isItemOpen}
                  aria-controls={answerId}
                >
                  <div className="text-xs text-slate-500">{item.category}</div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-200 font-semibold">{item.question}</span>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-slate-500 transition-transform",
                        isItemOpen && "rotate-180"
                      )}
                      aria-hidden="true"
                    />
                  </div>
                </button>
                {isItemOpen && (
                  <div
                    id={answerId}
                    role="region"
                    aria-label={item.question}
                    className="px-4 pb-4 text-sm text-slate-300 leading-relaxed"
                  >
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-500 text-center">
              לא נמצאו תוצאות. נסו מונח אחר.
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "rounded-full bg-white text-black flex items-center justify-center shadow-[0_12px_30px_rgba(0,0,0,0.45)] hover:scale-105 transition-transform",
          mode === "inline" ? "w-12 h-12" : "w-14 h-14"
        )}
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={isOpen ? "סגור שאלות נפוצות" : "פתח שאלות נפוצות"}
      >
        <MessageCircle className="w-6 h-6 text-slate-900" aria-hidden="true" />
      </button>
    </div>
  );
}
