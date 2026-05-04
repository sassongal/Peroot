"use client";

import { useId, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { FAQChatBot } from "@/components/features/faq/FAQChatBot";

type FAQBubbleProps = {
  mode?: "fixed" | "inline";
  defaultOpen?: boolean;
  onClose?: () => void;
};

export function FAQBubble({ mode = "fixed", defaultOpen = false, onClose }: FAQBubbleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelId = useId();
  const headingId = useId();

  const panelClass =
    mode === "inline"
      ? "relative w-full"
      : "fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:bottom-24 md:pb-0 pb-[env(safe-area-inset-bottom)] right-4 sm:right-6 z-[55]";

  const handleFeedback = () => {
    window.location.href =
      "mailto:gal@joya-tech.net?subject=משוב על Peroot&body=היי, רציתי להציע/לדווח...";
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
            : "w-[calc(100vw-2rem)] sm:w-[380px] md:w-[440px] h-[min(560px,calc(100vh-180px))] md:h-[min(600px,80vh)] flex flex-col rounded-[32px] border border-(--glass-border) bg-white/90 dark:bg-black/80 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-500 ease-out overscroll-contain",
          mode !== "inline" &&
            (isOpen
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 translate-y-8 scale-95 pointer-events-none"),
        )}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-(--glass-border) bg-(--glass-bg) backdrop-blur-md">
          <div className="flex flex-col">
            <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">
              מרכז עזרה
            </div>
            <h3
              id={headingId}
              className="text-lg md:text-xl text-(--text-primary) font-serif font-medium tracking-wide"
            >
              עוזר חכם
            </h3>
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              onClose?.();
            }}
            className="p-2.5 rounded-full border border-(--glass-border) bg-(--glass-bg) text-(--text-muted) hover:text-(--text-primary) hover:bg-black/5 dark:hover:bg-white/10 hover:border-black/15 dark:hover:border-white/20 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
            aria-label="סגור"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <FAQChatBot />

        {/* Footer: Help Us Improve */}
        <div className="p-4 bg-linear-to-t from-white/80 dark:from-black/80 to-transparent border-t border-(--glass-border) relative z-10">
          <button
            onClick={handleFeedback}
            className="w-full group relative overflow-hidden rounded-2xl bg-linear-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 p-4 text-right"
          >
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-blue-300 mb-0.5">עזרו לנו להשתפר</div>
                <div className="text-sm text-(--text-secondary) group-hover:text-(--text-primary) transition-colors">
                  מצאתם באג? יש לכם רעיון?
                </div>
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
            isOpen
              ? "bg-white rotate-90 scale-90"
              : "bg-linear-to-br from-white to-slate-200 hover:scale-110 hover:-translate-y-1",
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
