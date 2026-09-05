"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Moon,
  MoreHorizontal,
  Plug,
  Sparkles,
  Sun,
  Newspaper,
  Tag,
  LayoutTemplate,
  GraduationCap,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/ThemeProvider";
import { createClient } from "@/lib/supabase/client";
import { NAV_ITEM_BASE, NAV_ITEM_IDLE, NAV_ITEM_ACTIVE } from "@/components/layout/TopNavBar";

/**
 * Branded top bar for the PUBLIC pages (marketing/content/docs) — the same
 * visual language as the app's TopNavBar (same surface tokens, same dual-theme
 * logo, same link set) but link-driven: no HomeClient state, plain hrefs.
 * Rendered once by the (public) route-group layout, so every public page is
 * branded by construction.
 */

// Same icons and palette hues as the app bar, so a section keeps its mark
// across the site.
const NAV_LINKS: { href: string; label: string; Icon: LucideIcon; hue: string }[] = [
  { href: "/features", label: "יכולות", Icon: Layers, hue: "#F59E0B" },
  { href: "/prompts", label: "פרומפטים", Icon: Sparkles, hue: "#5376A4" },
  { href: "/templates", label: "תבניות", Icon: LayoutTemplate, hue: "#456F52" },
  { href: "/guide", label: "מדריך", Icon: GraduationCap, hue: "#6468d4" },
  { href: "/blog", label: "בלוג", Icon: Newspaper, hue: "#AC5050" },
  { href: "/pricing", label: "מחירים", Icon: Tag, hue: "#FDBE00" },
];

const MORE_LINKS: { href: string; label: string }[] = [
  ...NAV_LINKS.map(({ href, label }) => ({ href, label })),
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
      <div className="flex items-center justify-between gap-3 h-14 px-4 sm:px-6 max-w-[1920px] mx-auto">
        {/* Right: logo + links */}
        <div className="flex min-w-0 items-center gap-1">
          <Link
            href="/"
            className="flex items-center me-2 sm:me-3 shrink-0"
            title="דף הבית"
            aria-label="דף הבית"
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

          <span aria-hidden className="hidden lg:block h-6 w-px mx-1.5 bg-(--border-nav)" />

          {NAV_LINKS.map(({ href, label, Icon, hue }) => (
            <Link
              key={href}
              href={href}
              className={cn(NAV_ITEM_BASE, NAV_ITEM_IDLE, "hidden lg:flex")}
            >
              <Icon className="w-4 h-4" style={{ color: hue }} />
              <span>{label}</span>
            </Link>
          ))}

          {/* Mobile: "more" menu */}
          <div className="relative shrink-0 lg:hidden" ref={moreWrapRef}>
            <button
              ref={moreTriggerRef}
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className={cn(NAV_ITEM_BASE, moreOpen ? NAV_ITEM_ACTIVE : NAV_ITEM_IDLE)}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              aria-label="תפריט"
            >
              <MoreHorizontal className="w-4 h-4 shrink-0" />
              <span className="max-[360px]:hidden">עוד</span>
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
                      className="block px-5 py-3 text-base font-bold text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10"
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
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <Link
            href="/connect"
            className={cn(NAV_ITEM_BASE, NAV_ITEM_IDLE, "hidden sm:flex")}
            aria-label="Peroot Connect, חבר את הסוכן שלך"
            title="Peroot Connect, חבר את הסוכן שלך"
          >
            <Plug className="w-4 h-4" style={{ color: "#456F52" }} />
            <span>Connect</span>
          </Link>
          <button
            onClick={toggleTheme}
            className={cn(NAV_ITEM_BASE, NAV_ITEM_IDLE, "min-w-[44px]")}
            aria-label={theme === "dark" ? "עבור למצב בהיר" : "עבור למצב כהה"}
            title={theme === "dark" ? "מצב בהיר" : "מצב כהה"}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" style={{ color: "#FDBE00" }} />
            ) : (
              <Moon className="w-4 h-4" style={{ color: "#6468d4" }} />
            )}
            <span className="hidden sm:block">{theme === "dark" ? "בהיר" : "כהה"}</span>
          </button>
          {hasSession && (
            <Link
              href="/?view=personal"
              className={cn(NAV_ITEM_BASE, NAV_ITEM_IDLE, "hidden md:flex")}
            >
              <BookOpen className="w-4 h-4" style={{ color: "#456F52" }} />
              <span>הספרייה שלי</span>
            </Link>
          )}
          <span aria-hidden className="hidden sm:block h-6 w-px mx-1 bg-(--border-nav)" />
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
