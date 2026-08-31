"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Moon, MoreHorizontal, Plug, Sparkles, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/ThemeProvider";
import { createClient } from "@/lib/supabase/client";

/**
 * Branded top bar for the PUBLIC pages (marketing/content/docs) — the same
 * visual language as the app's TopNavBar (same surface tokens, same dual-theme
 * logo, same link set) but link-driven: no HomeClient state, plain hrefs.
 * Rendered once by the (public) route-group layout, so every public page is
 * branded by construction.
 */

const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/features", label: "יכולות" },
  { href: "/prompts", label: "פרומפטים" },
  { href: "/templates", label: "תבניות" },
  { href: "/guide", label: "מדריך" },
  { href: "/blog", label: "בלוג" },
  { href: "/pricing", label: "מחירים" },
];

const MORE_LINKS: { href: string; label: string }[] = [
  ...NAV_LINKS,
  { href: "/connect", label: "Peroot Connect, חיבור סוכנים" },
  { href: "/about", label: "אודות" },
  { href: "/contact", label: "צור קשר" },
];

export function PublicNavBar() {
  const { theme, toggleTheme } = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);
  // U3.5: a signed-in reader on a content page gets a direct road back to
  // their own library, not only an upsell-looking CTA.
  const [hasSession, setHasSession] = useState(false);
  useEffect(() => {
    try {
      createClient()
        .auth.getSession()
        .then(({ data }) => setHasSession(!!data.session))
        .catch(() => {});
    } catch {
      /* ignore */
    }
  }, []);
  const moreWrapRef = useRef<HTMLDivElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);

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
      moreTriggerRef.current?.focus();
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
        {/* Right: logo + links */}
        <div className="flex min-w-0 items-center gap-0.5 sm:gap-2">
          <Link
            href="/"
            className="flex items-center me-1 sm:me-4 shrink-0"
            aria-label="Peroot, לדף הבית"
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

          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="hidden lg:flex items-center px-3 py-2 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
            >
              {label}
            </Link>
          ))}

          {/* Mobile: "more" menu */}
          <div className="relative shrink-0 lg:hidden" ref={moreWrapRef}>
            <button
              ref={moreTriggerRef}
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className={cn(
                "flex items-center gap-1 px-2 py-2 rounded-lg text-sm font-medium transition-all min-h-[44px] min-w-[44px] justify-center focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none",
                moreOpen
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent",
              )}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              aria-label="תפריט"
            >
              <MoreHorizontal className="w-5 h-5 shrink-0" />
            </button>
            {moreOpen && (
              <>
                <button
                  type="button"
                  aria-label="סגור תפריט"
                  onClick={() => setMoreOpen(false)}
                  className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
                />
                <div
                  role="menu"
                  className="fixed inset-x-4 top-16 z-[61] rounded-2xl border border-(--border-nav) bg-(--surface-nav) py-2 shadow-2xl backdrop-blur-xl max-h-[calc(100svh-5rem)] overflow-y-auto"
                >
                  {MORE_LINKS.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      role="menuitem"
                      className="block px-5 py-3 text-base text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10"
                      onClick={() => setMoreOpen(false)}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Left: connect, theme, app CTA */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href="/connect"
            className="hidden sm:flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-amber-500/8 border border-transparent transition-all focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
            aria-label="Peroot Connect, חבר את הסוכן שלך"
            title="Peroot Connect, חבר את הסוכן שלך"
          >
            <Plug className="w-4 h-4" />
          </Link>
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent transition-all focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
            aria-label={theme === "dark" ? "עבור למצב בהיר" : "עבור למצב כהה"}
            title={theme === "dark" ? "מצב בהיר" : "מצב כהה"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {hasSession && (
            <Link
              href="/?view=personal"
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-amber-500/8 border border-transparent transition-all focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
            >
              <BookOpen className="w-4 h-4" />
              לספרייה שלי
            </Link>
          )}
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm font-bold bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">לשדרוג פרומפט</span>
            <span className="sm:hidden">לאפליקציה</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
