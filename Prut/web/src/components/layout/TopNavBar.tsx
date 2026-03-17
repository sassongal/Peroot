"use client";

import Link from "next/link";
import { BookOpen, Library, Wand2, Sun, Moon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/ThemeProvider";

type ViewMode = "home" | "library" | "personal";

const NAV_ITEMS: { id: ViewMode; label: string; Icon: LucideIcon }[] = [
  { id: "home", label: "שדרוג", Icon: Wand2 },
  { id: "library", label: "ספרייה", Icon: Library },
  { id: "personal", label: "שלי", Icon: BookOpen },
];

interface TopNavBarProps {
  viewMode: ViewMode | string;
  onNavigate: (view: ViewMode) => void;
  children?: React.ReactNode;
}

export function TopNavBar({ viewMode, onNavigate, children }: TopNavBarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav
      className="sticky top-0 z-50 w-full backdrop-blur-xl transition-colors duration-200"
      style={{
        background: "var(--surface-nav)",
        borderBottom: "1px solid var(--border-nav)",
      }}
      dir="rtl"
      aria-label="ניווט ראשי"
    >
      <div className="flex items-center justify-between h-14 px-4 sm:px-6 max-w-[1920px] mx-auto">
        {/* Right: Logo + Nav links */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 font-bold text-lg text-slate-900 dark:text-white me-2 sm:me-4 shrink-0"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey) return;
              e.preventDefault();
              onNavigate("home");
            }}
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-black/60 border border-amber-500/30 font-serif text-lg font-bold heading-highlight brand-mark-glow" aria-hidden="true">פ</span>
            <span className="hidden sm:inline text-base">Peroot</span>
          </Link>

          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const isActive = viewMode === id;
            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all min-h-[44px] min-w-[44px] justify-center sm:justify-start focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
                  isActive
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}

          <Link
            href="/blog"
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
          >
            בלוג
          </Link>

          <Link
            href="/pricing"
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
          >
            מחירים
          </Link>

          <Link
            href="/prompts"
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
          >
            פרומפטים
          </Link>

          <Link
            href="/guide"
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
          >
            מדריך
          </Link>
        </div>

        {/* Left: Controls slot */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent transition-all focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
            aria-label={theme === "dark" ? "עבור למצב בהיר" : "עבור למצב כהה"}
            title={theme === "dark" ? "מצב בהיר" : "מצב כהה"}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
          {children}
        </div>
      </div>
    </nav>
  );
}
