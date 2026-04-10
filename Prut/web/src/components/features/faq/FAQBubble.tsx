"use client";

import { useId, useMemo, useState } from "react";
import { MessageCircle, Search, X, ChevronDown, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { FAQ_ITEMS } from "@/lib/faq-data";

type FAQBubbleProps = {
  mode?: "fixed" | "inline";
  defaultOpen?: boolean;
  onClose?: () => void;
};

export function FAQBubble({ mode = "fixed", defaultOpen = false, onClose }: FAQBubbleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
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
      ? "relative w-full"
      : "fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:bottom-24 md:pb-0 pb-[env(safe-area-inset-bottom)] right-4 sm:right-6 z-[55]";

  const handleFeedback = () => {
     window.location.href = "mailto:gal@joya-tech.net?subject=משוב על Peroot&body=היי, רציתי להציע/לדווח...";
  };

  return (
    <div className={cn("flex flex-col items-end gap-3", mode === "inline" ? "relative" : "z-50")}>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headingId}
        aria-hidden={mode === "inline" ? false : !isOpen}
        className={cn(
          "faq-bubble-panel",
          panelClass,
          mode === "inline"
            ? "w-full min-h-0 max-h-[inherit] flex flex-col overflow-hidden"
            : "w-[calc(100vw-2rem)] sm:w-[380px] md:w-[440px] max-h-[calc(100vh-180px)] md:max-h-[80vh] flex flex-col rounded-[32px] border border-[var(--glass-border)] bg-white/90 dark:bg-black/80 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-500 ease-out overscroll-contain",
          mode !== "inline" && (isOpen ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95 pointer-events-none")
        )}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md">
          <div className="flex flex-col">
            <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">מרכז עזרה</div>
            <h3 id={headingId} className="text-lg md:text-xl text-[var(--text-primary)] font-serif font-medium tracking-wide">
              שאלות נפוצות
            </h3>
          </div>
          <button
            onClick={() => { setIsOpen(false); onClose?.(); }}
            className="p-2.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 hover:border-black/15 dark:hover:border-white/20 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
            aria-label="סגור"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
           {/* Search & Categories */}
           <div className="p-6 pb-2 space-y-5">
             <div className="relative group">
               <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
               <div className="relative flex items-center bg-black/5 dark:bg-black/50 border border-[var(--glass-border)] rounded-xl focus-within:border-black/20 dark:focus-within:border-white/20 focus-within:bg-black/10 dark:focus-within:bg-black/80 transition-all duration-300">
                  <Search className="w-4 h-4 text-slate-500 mr-3 ml-2" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="איך אפשר לעזור לך?"
                    aria-label="חיפוש שאלות נפוצות"
                    className="w-full bg-transparent border-none py-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-0 focus:outline-none"
                  />
               </div>
             </div>
 
             <div className="flex flex-wrap gap-2">
               {categories.map((category) => (
                 <button
                   key={category}
                   onClick={() => {
                     setActiveCategory(category);
                     setOpenIndex(0);
                   }}
                   className={cn(
                     "px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-300 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none min-h-[36px]",
                     activeCategory === category
                       ? "bg-slate-900 dark:bg-white text-white dark:text-black border-slate-900 dark:border-white shadow-lg shadow-black/10 dark:shadow-white/10 scale-105"
                       : "bg-[var(--glass-bg)] text-[var(--text-muted)] border-[var(--glass-border)] hover:bg-black/5 dark:hover:bg-white/10 hover:border-black/10 dark:hover:border-white/10 hover:text-[var(--text-secondary)]"
                   )}
                 >
                   {category}
                 </button>
               ))}
             </div>
           </div>
 
           {/* Questions List */}
           <div className="px-6 pb-4 space-y-3 overflow-y-auto min-h-0 flex-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
             {filtered.map((item, index) => {
               const isItemOpen = openIndex === index;
               return (
                 <div
                   key={`${item.category}-${item.question}`}
                   className={cn(
                     "rounded-2xl border transition-all duration-300 overflow-hidden",
                     isItemOpen
                        ? "bg-black/[0.04] dark:bg-white/[0.08] border-black/15 dark:border-white/20 shadow-lg"
                        : "bg-[var(--glass-bg)] border-[var(--glass-border)] hover:border-black/10 dark:hover:border-white/10 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                   )}
                 >
                   <button
                     onClick={() => setOpenIndex(isItemOpen ? null : index)}
                     className="w-full flex items-start justify-between px-5 py-4 text-right gap-4 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                     aria-expanded={isItemOpen}
                     aria-label={item.question}
                   >
                     <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-[var(--text-muted)] tracking-wide">{item.category}</span>
                        <span className={cn("text-base transition-colors duration-300 font-medium leading-snug", isItemOpen ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]")}>
                           {item.question}
                        </span>
                     </div>
                     <div className={cn(
                        "mt-1 p-1 rounded-full border transition-all duration-300",
                        isItemOpen ? "bg-slate-900 dark:bg-white text-white dark:text-black border-slate-900 dark:border-white rotate-180" : "border-[var(--glass-border)] text-[var(--text-muted)]"
                     )}>
                        <ChevronDown className="w-3.5 h-3.5" />
                     </div>
                   </button>
                   
                   <div className={cn(
                      "grid transition-all duration-300 ease-in-out",
                      isItemOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                   )}>
                     <div className="overflow-hidden">
                        <div className="px-5 pb-5 pt-0 text-base text-[var(--text-secondary)] leading-relaxed border-t border-[var(--glass-border)] mt-2">
                           <div className="h-2"></div>
                           {item.answer}
                        </div>
                     </div>
                   </div>
                 </div>
               );
             })}
 
             {filtered.length === 0 && (
               <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                 <div className="w-12 h-12 rounded-full bg-[var(--glass-bg)] flex items-center justify-center">
                    <Search className="w-5 h-5 text-[var(--text-muted)]" />
                 </div>
                 <p className="text-sm text-[var(--text-muted)]">לא נמצאו תוצאות עבור &quot;{query}&quot;</p>
               </div>
             )}
           </div>
        </div>

        {/* Footer: Help Us Improve */}
        <div className="p-4 bg-gradient-to-t from-white/80 dark:from-black/80 to-transparent border-t border-[var(--glass-border)] relative z-10">
           <button 
              onClick={handleFeedback}
              className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 p-4 text-right"
           >
              <div className="relative z-10 flex items-center justify-between">
                 <div>
                    <div className="text-xs font-bold text-blue-300 mb-0.5">עזרו לנו להשתפר</div>
                    <div className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">מצאתם באג? יש לכם רעיון?</div>
                 </div>
                 <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-500/30 transition-all duration-300">
                    <Send className="w-4 h-4 text-blue-300" />
                 </div>
              </div>
           </button>
        </div>

      </div>

      {/* Floating trigger button — hidden in inline/mobile mode */}
      {mode !== "inline" && (
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "relative group rounded-full flex items-center justify-center shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] transition-all duration-500",
            "w-16 h-16",
            isOpen ? "bg-white rotate-90 scale-90" : "bg-gradient-to-br from-white to-slate-200 hover:scale-110 hover:-translate-y-1"
          )}
          aria-expanded={isOpen}
          aria-controls={panelId}
          aria-label={isOpen ? "סגור" : "פתח"}
        >
          {isOpen ? (
              <X className="w-6 h-6 text-black" />
          ) : (
              <>
                  <div className="absolute inset-0 rounded-full bg-white blur-lg opacity-40 group-hover:opacity-70 transition-opacity duration-300"></div>
                  <MessageCircle className="w-7 h-7 text-black relative z-10" fill="currentColor" />
              </>
          )}
        </button>
      )}
    </div>
  );
}
