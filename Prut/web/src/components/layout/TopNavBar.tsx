"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Library, Wand2, Sun, Moon, MoreHorizontal, Network, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/ThemeProvider";

const MORE_NAV_LINKS: { href: string; label: string }[] = [
  { href: "/blog", label: "בלוג" },
  { href: "/pricing", label: "מחירים" },
  { href: "/prompts", label: "פרומפטים" },
  { href: "/templates", label: "תבניות" },
  { href: "/guide", label: "מדריך" },
];

type ViewMode = "home" | "library" | "personal";

const NAV_ITEMS: { id: ViewMode; label: string; Icon: LucideIcon }[] = [
  { id: "home", label: "שפר", Icon: Wand2 },
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
  const [moreOpen, setMoreOpen] = useState(false);
  const moreWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: MouseEvent) => {
      if (moreWrapRef.current?.contains(e.target as Node)) return;
      setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

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
        <div className="flex min-w-0 items-center gap-0.5 sm:gap-2 overflow-visible">
          <Link
            href="/"
            className="flex items-center me-1 sm:me-4 shrink-0"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey) return;
              e.preventDefault();
              onNavigate("home");
            }}
          >
            <Image
              src="/images/peroot_logo_pack/logo_dark_240.png"
              alt="Peroot"
              width={240}
              height={240}
              className="block dark:hidden h-7 sm:h-9 w-auto"
              priority
            />
            <Image
              src="/images/peroot_logo_pack/logo_dark_navbar_2x.png"
              alt="Peroot"
              width={240}
              height={240}
              className="hidden dark:block h-7 sm:h-9 w-auto"
              priority
            />
          </Link>

          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const isActive = viewMode === id;
            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={cn(
                  // On mobile the MobileTabBar already provides home/library/personal —
                  // hiding these avoids duplicating nav and freeing space for children.
                  "hidden sm:flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-sm font-medium transition-all min-h-[44px] min-w-[44px] justify-center sm:justify-start focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
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

          {/* Graph button — navigates to personal library and opens graph view */}
          <button
            onClick={() => {
              onNavigate("personal");
              window.dispatchEvent(new CustomEvent("peroot:open-graph"));
            }}
            className={cn(
              "hidden sm:flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-sm font-medium transition-all min-h-[44px] min-w-[44px] justify-center sm:justify-start focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:outline-none border",
              viewMode === "personal"
                ? "bg-purple-500/15 text-purple-500 dark:text-purple-300 border-purple-500/30"
                : "text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-purple-500/8 border-transparent"
            )}
            title="גרף הפרומפטים שלי"
            aria-label="פתח גרף הספרייה האישית"
          >
            <Network
              className={cn(
                "w-4 h-4 transition-all",
                viewMode !== "personal" && "animate-pulse"
              )}
            />
            <span className="hidden sm:inline">גרף</span>
          </button>

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
            href="/templates"
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
          >
            תבניות
          </Link>

          <Link
            href="/guide"
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
          >
            מדריך
          </Link>

          <div className="relative shrink-0 md:hidden" ref={moreWrapRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className={cn(
                "flex items-center gap-1 px-2 py-2 rounded-lg text-sm font-medium transition-all min-h-[44px] min-w-[44px] justify-center focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
                moreOpen
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
              )}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              aria-label="עוד קישורים"
            >
              <MoreHorizontal className="w-5 h-5 shrink-0" />
              <span className="text-xs font-medium max-[360px]:hidden">עוד</span>
            </button>
            {moreOpen && (
              <div
                role="menu"
                className="absolute end-0 top-full z-60 mt-1 min-w-44 rounded-xl border border-(--border-nav) bg-(--surface-nav) py-1 shadow-lg backdrop-blur-xl"
              >
                {MORE_NAV_LINKS.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    role="menuitem"
                    className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10"
                    onClick={() => setMoreOpen(false)}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
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
