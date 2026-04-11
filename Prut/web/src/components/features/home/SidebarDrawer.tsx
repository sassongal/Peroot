"use client";

import { memo, useCallback } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { BookOpen, Star, Library, X, Maximize2, Minimize2 } from "lucide-react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { useI18n } from "@/context/I18nContext";
import { HistoryItem } from "@/hooks/useHistory";

const HistoryPanel = dynamic(
  () => import("@/components/features/history/HistoryPanel").then(mod => mod.HistoryPanel),
  { ssr: false, loading: () => <div className="animate-pulse rounded-xl bg-(--glass-bg) h-64" /> }
);

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  isLoaded: boolean;
  onRestore: (item: HistoryItem) => void;
  onClear: () => void;
  onSaveToPersonal: (item: HistoryItem) => void;
  onCopy: (text: string, withWatermark?: boolean) => Promise<void>;
  onStartNew: () => void;
  onNavPersonal: () => void;
  onNavFavorites: () => void;
  onNavLibrary: () => void;
  personalView: string;
  prefetchPersonalLibrary: () => void;
  onRenameHistoryTitle?: (id: string, title: string) => Promise<void>;
  onBumpHistoryLastUsed?: (id: string) => void;
}

export const SidebarDrawer = memo<SidebarDrawerProps>(({
  isOpen,
  onClose,
  history,
  isLoaded,
  onRestore,
  onClear,
  onSaveToPersonal,
  onCopy,
  onStartNew,
  onNavPersonal,
  onNavFavorites,
  onNavLibrary,
  personalView,
  prefetchPersonalLibrary,
  onRenameHistoryTitle,
  onBumpHistoryLastUsed,
}) => {
  const t = useI18n();
  // Lazy localStorage read — eliminates the cascading-setState pattern
  // (default → effect reads → setState → rerender) that blocks INP on
  // mount. See src/hooks/useLocalStorage.ts for the rationale.
  const [expanded, setExpanded] = useLocalStorage<boolean>('peroot_sidebar_expanded', false);
  const focusTrapRef = useFocusTrap<HTMLDivElement>(isOpen);

  const handleRestore = useCallback((item: HistoryItem) => {
    onRestore(item);
    onClose();
  }, [onRestore, onClose]);

  const handleStartNew = useCallback(() => {
    onStartNew();
    onClose();
  }, [onStartNew, onClose]);

  const handleNavPersonal = useCallback(() => {
    onNavPersonal();
    onClose();
  }, [onNavPersonal, onClose]);

  const handleNavFavorites = useCallback(() => {
    onNavFavorites();
    onClose();
  }, [onNavFavorites, onClose]);

  const handleNavLibrary = useCallback(() => {
    onNavLibrary();
    onClose();
  }, [onNavLibrary, onClose]);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-55 bg-black/40 dark:bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      {/* Sidebar Drawer */}
      <div ref={focusTrapRef} role="dialog" aria-modal="true" aria-label="היסטוריה" className={cn(
        "fixed right-0 z-60 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-s border-black/10 dark:border-white/10 flex flex-col transition-all duration-300 ease-out",
        isOpen ? "translate-x-0" : "translate-x-full",
        "top-0 h-full w-full",
        "md:top-14 md:h-[calc(100vh-3.5rem)]",
        expanded ? "md:w-[560px]" : "md:w-[340px]"
      )}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-black/5 dark:border-white/5">
          <span className="text-sm font-bold text-(--text-primary)">היסטוריה</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="hidden md:flex p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
              title={expanded ? "כווץ תפריט" : "הרחב תפריט"}
              aria-label={expanded ? "כווץ תפריט" : "הרחב תפריט"}
            >
              {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer"
              aria-label="סגור תפריט"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Buttons - mobile only (desktop has TopNavBar) */}
        <div className="flex flex-col gap-2 p-4 md:hidden">
          <button
            onClick={handleNavPersonal}
            onMouseEnter={prefetchPersonalLibrary}
            onTouchStart={prefetchPersonalLibrary}
            className="w-full flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-xl text-sm font-bold transition-all border border-(--glass-border) hover:border-amber-400/30 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-300 text-(--text-muted) group bg-black/5 dark:bg-black/20 cursor-pointer"
          >
            <BookOpen className="w-5 h-5" />
            <span>{t.home.personal_library}</span>
          </button>

          <button
            onClick={handleNavFavorites}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-xl text-sm font-bold transition-all border border-(--glass-border) hover:border-amber-400/30 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-300 text-(--text-muted) group cursor-pointer",
              personalView === "favorites" ? "bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-400/50" : "bg-black/5 dark:bg-black/20"
            )}
          >
            <Star className="w-5 h-5" />
            <span>{t.home.favorites}</span>
          </button>

          <button
            onClick={handleNavLibrary}
            className="w-full flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-xl text-sm font-bold transition-all border border-(--glass-border) hover:border-amber-400/30 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-300 text-(--text-muted) group bg-black/5 dark:bg-black/20 cursor-pointer"
          >
            <Library className="w-5 h-5" />
            <span>{t.home.public_library}</span>
          </button>
        </div>

        {/* History Panel - takes remaining space */}
        <div className="flex-1 min-h-0 px-4 pb-4">
          <HistoryPanel
            history={history}
            isLoaded={isLoaded}
            onRestore={handleRestore}
            onClear={onClear}
            onSaveToPersonal={onSaveToPersonal}
            onCopy={onCopy}
            onStartNew={handleStartNew}
            onRenameTitle={onRenameHistoryTitle}
            onBumpLastUsed={onBumpHistoryLastUsed}
          />
        </div>
      </div>
    </>
  );
});

SidebarDrawer.displayName = "SidebarDrawer";
