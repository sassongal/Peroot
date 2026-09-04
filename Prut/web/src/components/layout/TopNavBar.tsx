"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Library,
  Wand2,
  Sun,
  Moon,
  MoreHorizontal,
  Network,
  Plug,
  Newspaper,
  Tag,
  Sparkles,
  LayoutTemplate,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/ThemeProvider";

/**
 * Top bar (owner direction, 2026-09-04): every section is a small coloured
 * icon above a bold label, sections are spaced and grouped with thin
 * dividers, and the signed-in state is a green dot on the avatar (in
 * user-nav), not a word. Icon hues come from the palette in DESIGN.md: the
 * five engine hues plus Signal Gold for "שפר", the one gold item in the bar.
 */
const HUE = {
  gold: "#F59E0B",
  blue: "#5376A4",
  green: "#456F52",
  red: "#AC5050",
  amber: "#FDBE00",
  indigo: "#6468d4",
} as const;

const MORE_NAV_LINKS: { href: string; label: string }[] = [
  { href: "/connect", label: "Peroot Connect, חיבור סוכנים" },
  { href: "/blog", label: "בלוג" },
  { href: "/pricing", label: "מחירים" },
  { href: "/prompts", label: "פרומפטים" },
  { href: "/templates", label: "תבניות" },
  { href: "/guide", label: "מדריך" },
];

const SITE_LINKS: { href: string; label: string; Icon: LucideIcon; hue: string }[] = [
  { href: "/blog", label: "בלוג", Icon: Newspaper, hue: HUE.red },
  { href: "/pricing", label: "מחירים", Icon: Tag, hue: HUE.amber },
  { href: "/prompts", label: "פרומפטים", Icon: Sparkles, hue: HUE.blue },
  { href: "/templates", label: "תבניות", Icon: LayoutTemplate, hue: HUE.green },
  { href: "/guide", label: "מדריך", Icon: GraduationCap, hue: HUE.indigo },
];

type ViewMode = "home" | "library" | "personal";

const NAV_ITEMS: { id: ViewMode; label: string; Icon: LucideIcon; hue: string }[] = [
  { id: "home", label: "שפר", Icon: Wand2, hue: HUE.gold },
  { id: "library", label: "ספרייה", Icon: Library, hue: HUE.blue },
  { id: "personal", label: "ספרייה אישית", Icon: BookOpen, hue: HUE.green },
];

/** Shared look of every bar section: icon on top, bold label under it. */
export const NAV_ITEM_BASE =
  "flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 min-w-[52px] min-h-[44px] rounded-lg text-[11px] font-bold leading-none whitespace-nowrap border transition-all focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none cursor-pointer";
export const NAV_ITEM_IDLE =
  "border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5";
export const NAV_ITEM_ACTIVE =
  "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300";

/** Thin vertical rule between groups of sections. */
function Divider() {
  return <span aria-hidden className="hidden sm:block h-6 w-px mx-1.5 bg-(--border-nav)" />;
}

interface TopNavBarProps {
  viewMode: ViewMode | string;
  onNavigate: (view: ViewMode) => void;
  onOpenGraph?: () => void;
  children?: React.ReactNode;
}

export function TopNavBar({ viewMode, onNavigate, onOpenGraph, children }: TopNavBarProps) {
  const { theme, toggleTheme } = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreWrapRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
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
    // Move focus into the menu so keyboard users aren't stranded behind the
    // backdrop; restore to the trigger on close.
    const firstItem = moreMenuRef.current?.querySelector<HTMLAnchorElement>('a[role="menuitem"]');
    firstItem?.focus();
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
        {/* Right: Logo + sections */}
        <div className="flex min-w-0 items-center gap-1 overflow-visible">
          <Link
            href="/"
            className="flex items-center me-2 sm:me-3 shrink-0"
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

          <Divider />

          {/* App views. Phones reach them from the tab bar, so they are
              desktop-only here. */}
          {NAV_ITEMS.map(({ id, label, Icon, hue }) => {
            const isActive = viewMode === id;
            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={cn(
                  NAV_ITEM_BASE,
                  isActive ? NAV_ITEM_ACTIVE : NAV_ITEM_IDLE,
                  "hidden sm:flex",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="w-4 h-4" style={{ color: isActive ? undefined : hue }} />
                <span>{label}</span>
              </button>
            );
          })}

          {/* Graph: the personal library's connections view. */}
          <button
            onClick={() => {
              if (onOpenGraph) onOpenGraph();
              else onNavigate("personal");
            }}
            className={cn(
              NAV_ITEM_BASE,
              viewMode === "personal" ? NAV_ITEM_ACTIVE : NAV_ITEM_IDLE,
              "hidden sm:flex",
            )}
            title="הקשרים בין הפרומפטים שלי"
            aria-label="פתח את מסך הקשרים"
          >
            <Network
              className="w-4 h-4"
              style={{ color: viewMode === "personal" ? undefined : HUE.indigo }}
            />
            <span>קשרים</span>
          </button>

          <span aria-hidden className="hidden xl:block h-6 w-px mx-1.5 bg-(--border-nav)" />

          {SITE_LINKS.map(({ href, label, Icon, hue }) => (
            <Link
              key={href}
              href={href}
              className={cn(NAV_ITEM_BASE, NAV_ITEM_IDLE, "hidden xl:flex")}
            >
              <Icon className="w-4 h-4" style={{ color: hue }} />
              <span>{label}</span>
            </Link>
          ))}

          <div className="relative shrink-0 xl:hidden" ref={moreWrapRef}>
            <button
              ref={moreTriggerRef}
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className={cn(NAV_ITEM_BASE, moreOpen ? NAV_ITEM_ACTIVE : NAV_ITEM_IDLE)}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              aria-label="עוד קישורים"
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
                  ref={moreMenuRef}
                  role="menu"
                  className="fixed inset-x-4 top-16 z-[61] rounded-2xl border border-(--border-nav) bg-(--surface-nav) py-2 shadow-2xl backdrop-blur-xl max-h-[calc(100svh-5rem)] overflow-y-auto"
                >
                  {MORE_NAV_LINKS.map(({ href, label }) => (
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

        {/* Left: utilities, then the page's own controls */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          {/* Phones reach Connect from the "עוד" menu (first item). */}
          <Link
            href="/connect"
            className={cn(NAV_ITEM_BASE, NAV_ITEM_IDLE, "hidden sm:flex")}
            aria-label="Peroot Connect, חבר את הסוכן שלך"
            title="Peroot Connect, חבר את הסוכן שלך"
          >
            <Plug className="w-4 h-4" style={{ color: HUE.green }} />
            <span>Connect</span>
          </Link>
          <button
            onClick={toggleTheme}
            className={cn(NAV_ITEM_BASE, NAV_ITEM_IDLE, "min-w-[44px]")}
            aria-label={theme === "dark" ? "עבור למצב בהיר" : "עבור למצב כהה"}
            title={theme === "dark" ? "מצב בהיר" : "מצב כהה"}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" style={{ color: HUE.amber }} />
            ) : (
              <Moon className="w-4 h-4" style={{ color: HUE.indigo }} />
            )}
            <span className="hidden sm:block">{theme === "dark" ? "בהיר" : "כהה"}</span>
          </button>
          {children ? <Divider /> : null}
          {children}
        </div>
      </div>
    </nav>
  );
}
