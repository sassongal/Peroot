"use client";

import { useLibraryContext } from "@/context/LibraryContext";
import { PersonalPrompt, LibraryPrompt } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LogIn, BookOpen, Star, Network, History } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

import { PersonalLibraryHeader } from "./personal-library/PersonalLibraryHeader";
import { PersonalLibraryGrid } from "./personal-library/PersonalLibraryGrid";
import { PersonalLibraryModals } from "./personal-library/PersonalLibraryModals";
import { PersonalLibrarySidebar } from "./personal-library/PersonalLibrarySidebar";
import { PromptGraphView } from "@/components/features/library/PromptGraphView";
import { LibraryBottomNav } from "@/components/features/library/LibraryBottomNav";
import { GuestGraphPreview } from "@/components/features/library/GuestGraphPreview";
import { MemoryPalaceSidebar } from "@/components/features/library/memory-palace/MemoryPalaceSidebar";
import { MemoryPalaceDrawer } from "@/components/features/library/memory-palace/MemoryPalaceDrawer";
import {
  PersonalLibraryProvider,
  usePersonalLibrarySidebar,
  usePersonalLibraryViewPrefs,
  usePersonalLibraryShell,
  usePersonalLibraryActions,
} from "./personal-library/context/PersonalLibraryContext";

interface PersonalLibraryViewProps {
  onUsePrompt: (prompt: PersonalPrompt | LibraryPrompt) => void;
  onCopyText: (text: string) => Promise<void>;
  handleImportHistory: () => void;
  historyLength: number;
  openToGraph?: boolean;
  onGraphOpened?: () => void;
}

// ─── Guest gate ───────────────────────────────────────────────────────────────
// Login prompt for unauthenticated visitors instead of an infinite spinner.
function GuestGate() {
  return (
    <div
      className="flex items-center justify-center min-h-[70vh] px-4 animate-in fade-in duration-500"
      dir="rtl"
    >
      <div className="w-full max-w-lg bg-white/95 dark:bg-zinc-950/90 border border-white/10 rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center gap-5">
        <GuestGraphPreview height={220} />
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/15 to-yellow-500/10 border border-amber-500/20 flex items-center justify-center">
          <Image
            src="/images/peroot_logo_pack/logo_dark_240.png"
            alt="Peroot"
            width={40}
            height={40}
            className="block dark:hidden"
            style={{ width: "auto", height: "auto" }}
          />
          <Image
            src="/images/peroot_logo_pack/logo_dark_navbar_2x.png"
            alt="Peroot"
            width={40}
            height={40}
            className="hidden dark:block"
            style={{ width: "auto", height: "auto" }}
          />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            הספרייה האישית שלך מחכה
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            התחבר כדי לגשת לכל הפרומפטים שלך, המועדפים, הגרף האישי וההיסטוריה.
          </p>
        </div>

        <ul className="w-full space-y-3 text-sm text-right">
          {[
            {
              Icon: BookOpen,
              color: "text-amber-500",
              label: "ספרייה אישית — כל הפרומפטים שלך במקום אחד",
            },
            {
              Icon: Star,
              color: "text-yellow-500",
              label: "מועדפים — גישה מהירה לפרומפטים שאהבת",
            },
            {
              Icon: Network,
              color: "text-indigo-500",
              label: "גרף ידע — ויזואליזציה של הקשרים בין הפרומפטים",
            },
            { Icon: History, color: "text-blue-500", label: "היסטוריה — כל הפרומפטים שיצרת" },
          ].map(({ Icon, color, label }) => (
            <li key={label} className="flex items-start gap-3">
              <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", color)} />
              <span className="text-slate-600 dark:text-slate-400">{label}</span>
            </li>
          ))}
        </ul>

        <div className="w-full flex flex-col gap-3 pt-2">
          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 rounded-xl text-white font-semibold shadow-lg transition-all"
          >
            <LogIn className="w-4 h-4" />
            התחבר עכשיו
          </Link>
          <Link
            href="/login?tab=signup"
            className="w-full flex items-center justify-center py-3 px-5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm transition-colors"
          >
            פתח חשבון חינם
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Layout ─────────────────────────────────────────────────────────────────
// The library chrome: header, sidebar, grid/graph, modals, bottom nav, and the
// Memory Palace surfaces. Everything it needs now comes from focused hooks, so
// no `shared` object is drilled through the tree.
function PersonalLibraryLayout() {
  const ctx = useLibraryContext();
  const { favoritePersonalIds, selectedPromptId, setSelectedPromptId, isPersonalLoaded } = ctx;
  const { sidebarOpen, setSidebarOpen } = usePersonalLibrarySidebar();
  const { localViewType } = usePersonalLibraryViewPrefs();
  const { onUsePrompt } = usePersonalLibraryActions();
  const {
    corpusPrompts,
    corpusLoading,
    corpusTruncatedAt,
    lastOpenedPromptId,
    setLastOpenedPromptId,
    setExpandedIds,
    setExpandedIdsTracked,
    drawerCenter,
    setDrawerCenter,
  } = usePersonalLibraryShell();

  if (isPersonalLoaded && !ctx.user) {
    return <GuestGate />;
  }

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative pb-20 md:pb-0 overflow-x-hidden w-full"
      dir="rtl"
    >
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile slide-out drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="תיקיות הספרייה האישית"
        aria-hidden={!sidebarOpen}
        inert={!sidebarOpen}
        className={cn(
          "fixed top-0 start-0 h-full w-72 max-w-[85vw] z-50 bg-[#0A0A0F] border-e border-(--glass-border) shadow-2xl transition-transform duration-300 md:hidden overflow-y-auto pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]",
          sidebarOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <PersonalLibrarySidebar isMobile={true} />
      </div>

      {/* Top Bar */}
      <PersonalLibraryHeader />

      {/* Main layout: sidebar + content */}
      {localViewType === "graph" ? (
        <ErrorBoundary name="PromptGraphView">
          <PromptGraphView
            prompts={corpusPrompts}
            favoriteIds={favoritePersonalIds}
            onUsePrompt={(p) => onUsePrompt(p)}
            isLoading={corpusLoading}
            truncatedAt={corpusTruncatedAt}
          />
        </ErrorBoundary>
      ) : (
        <div className="flex gap-4 items-start">
          {/* Desktop Sidebar */}
          <aside className="hidden md:flex flex-col w-[260px] shrink-0 sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-white/8 bg-black/5 dark:bg-black/30 backdrop-blur-sm">
            <PersonalLibrarySidebar isMobile={false} />
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <PersonalLibraryGrid />
          </div>

          {/* Memory Palace sidebar (desktop only) */}
          <MemoryPalaceSidebar
            prompts={corpusPrompts}
            selectedPromptId={selectedPromptId}
            lastOpenedPromptId={lastOpenedPromptId}
            onSelectPrompt={setSelectedPromptId}
            onOpenPrompt={(id) => {
              setLastOpenedPromptId(id);
              setSelectedPromptId(id);
              setExpandedIds((prev) => {
                const next = new Set(prev);
                next.add(id);
                return next;
              });
            }}
          />
        </div>
      )}

      {/* Modals, floating bars, context menus */}
      <PersonalLibraryModals />

      {/* Mobile bottom navigation */}
      <LibraryBottomNav />

      {/* Memory Palace mobile drawer */}
      <MemoryPalaceDrawer
        open={drawerCenter !== null}
        centerPromptId={drawerCenter}
        prompts={corpusPrompts}
        onClose={() => setDrawerCenter(null)}
        onOpenPrompt={(id) => {
          setLastOpenedPromptId(id);
          setSelectedPromptId(id);
          setExpandedIdsTracked((prev) => {
            const next = new Set(prev);
            next.add(id);
            return next;
          });
        }}
      />
    </div>
  );
}

export function PersonalLibraryView({
  onUsePrompt,
  onCopyText,
  handleImportHistory,
  historyLength,
  openToGraph,
  onGraphOpened,
}: PersonalLibraryViewProps) {
  return (
    <PersonalLibraryProvider
      onUsePrompt={onUsePrompt}
      onCopyText={onCopyText}
      handleImportHistory={handleImportHistory}
      historyLength={historyLength}
      openToGraph={openToGraph}
      onGraphOpened={onGraphOpened}
    >
      <PersonalLibraryLayout />
    </PersonalLibraryProvider>
  );
}
