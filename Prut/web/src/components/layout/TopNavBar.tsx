"use client";

import Link from "next/link";
import { BookOpen, Library, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "home" | "library" | "personal";

interface TopNavBarProps {
  viewMode: ViewMode | string;
  onNavigate: (view: ViewMode) => void;
  children?: React.ReactNode; // Slot for right-side controls (UserMenu, credits, sidebar toggle)
}

/**
 * Persistent top navigation bar for the homepage.
 * Shows main navigation links that are always visible.
 * `children` renders in the right slot (for UserMenu, PromptLimitIndicator, etc.)
 */
export function TopNavBar({ viewMode, onNavigate, children }: TopNavBarProps) {
  const navItems: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: "home", label: "שדרוג", icon: <Wand2 className="w-4 h-4" /> },
    { id: "library", label: "ספרייה", icon: <Library className="w-4 h-4" /> },
    { id: "personal", label: "שלי", icon: <BookOpen className="w-4 h-4" /> },
  ];

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
              e.preventDefault();
              onNavigate("home");
            }}
          >
            <span className="text-amber-400">P</span>
            <span className="hidden sm:inline">Peroot</span>
          </Link>

          {navItems.map((item) => {
            const isActive = viewMode === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all min-h-[36px]",
                  isActive
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {item.icon}
                <span className="hidden sm:inline">{item.label}</span>
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
