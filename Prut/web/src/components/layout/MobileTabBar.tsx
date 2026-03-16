"use client";

import { Home, Library, BookOpen, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type TabName = "home" | "library" | "personal" | "history";

interface Tab {
  name: TabName;
  label: string;
  icon: React.ElementType;
}

const TABS: Tab[] = [
  { name: "home",     label: "שדרוג",    icon: Home },
  { name: "library",  label: "ספרייה",   icon: Library },
  { name: "personal", label: "שלי",      icon: BookOpen },
  { name: "history",  label: "היסטוריה", icon: Clock },
];

interface MobileTabBarProps {
  activeTab: string;
  onTabChange: (tab: TabName) => void;
}

export function MobileTabBar({ activeTab, onTabChange }: MobileTabBarProps) {
  return (
    <nav
      dir="rtl"
      aria-label="ניווט ראשי"
      className={cn(
        "fixed bottom-0 inset-x-0 z-[45]",
        "flex md:hidden",
        "bg-black/90 backdrop-blur-xl border-t border-white/10",
        "min-h-[56px] pb-[env(safe-area-inset-bottom)]"
      )}
    >
      {TABS.map(({ name, label, icon: Icon }) => {
        const isActive = activeTab === name;
        return (
          <button
            key={name}
            onClick={() => onTabChange(name)}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5",
              "min-h-[44px] transition-colors duration-200 cursor-pointer",
              isActive ? "text-amber-400" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium leading-tight">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
