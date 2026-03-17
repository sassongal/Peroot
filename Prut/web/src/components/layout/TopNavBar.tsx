"use client";

import Link from "next/link";
import Image from "next/image";
import { BookOpen, Library, Wand2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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

  return (
    <nav
      className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/80 backdrop-blur-xl"
      dir="rtl"
      aria-label="ניווט ראשי"
    >
      <div className="flex items-center justify-between h-14 px-4 sm:px-6 max-w-[1920px] mx-auto">
        {/* Right: Logo + Nav links */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 font-bold text-lg text-white me-2 sm:me-4 shrink-0"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey) return;
              e.preventDefault();
              onNavigate("home");
            }}
          >
            <Image
              src="/assets/branding/nav-logo.webp"
              alt="Peroot – מחולל פרומפטים בעברית"
              width={36}
              height={36}
              className="rounded-lg"
              priority
            />
            <span className="hidden sm:inline text-base">Peroot</span>
          </Link>

          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const isActive = viewMode === id;
            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all min-h-[36px]",
                  isActive
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
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
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
          >
            בלוג
          </Link>

          <Link
            href="/pricing"
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
          >
            מחירים
          </Link>
        </div>

        {/* Left: Controls slot */}
        <div className="flex items-center gap-2 sm:gap-3">
          {children}
        </div>
      </div>
    </nav>
  );
}
