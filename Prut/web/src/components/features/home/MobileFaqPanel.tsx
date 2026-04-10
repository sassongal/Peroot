"use client";

import { memo, useCallback } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const FAQBubble = dynamic(
  () => import("@/components/features/faq/FAQBubble").then(mod => mod.FAQBubble),
  { ssr: false, loading: () => <div className="animate-pulse rounded-full bg-[var(--glass-bg)] w-12 h-12" /> }
);

interface MobileFaqPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileFaqPanel = memo<MobileFaqPanelProps>(({ isOpen, onClose }) => {
  const focusTrapRef = useFocusTrap<HTMLDivElement>(isOpen);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div
        role="presentation"
        className="fixed inset-0 z-[55] bg-black/40 dark:bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-label="שאלות נפוצות"
        onKeyDown={handleKeyDown}
        className="fixed inset-x-0 bottom-0 z-[60] md:hidden max-h-[min(90dvh,100vh)] flex flex-col rounded-t-3xl bg-white/95 dark:bg-black/95 backdrop-blur-xl border-t border-[var(--glass-border)] animate-in slide-in-from-bottom-4 duration-300 pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-black/10 dark:bg-white/20" />
        </div>
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <ErrorBoundary name="FAQBubble-mobile">
            <FAQBubble mode="inline" defaultOpen onClose={onClose} />
          </ErrorBoundary>
        </div>
      </div>
    </>
  );
});

MobileFaqPanel.displayName = "MobileFaqPanel";
