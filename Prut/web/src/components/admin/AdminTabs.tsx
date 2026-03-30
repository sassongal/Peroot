"use client";

import { useState, Suspense, lazy, ComponentType } from "react";
import { cn } from "@/lib/utils";
import { RefreshCw, LucideIcon } from "lucide-react";

export interface AdminTab {
  id: string;
  label: string;
  icon?: LucideIcon;
  component: ComponentType;
}

interface AdminTabsProps {
  tabs: AdminTab[];
  defaultTab?: string;
}

function TabLoader() {
  return (
    <div className="flex items-center justify-center py-32">
      <RefreshCw className="w-8 h-8 animate-spin text-blue-500/20" />
    </div>
  );
}

export function AdminTabs({ tabs, defaultTab }: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || "");
  const ActiveComponent = tabs.find((t) => t.id === activeTab)?.component;

  return (
    <div className="space-y-8">
      {/* Tab Switcher */}
      <div className="flex p-1.5 bg-zinc-950/50 border border-white/5 rounded-[28px] gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-0",
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-zinc-600 hover:text-zinc-300"
              )}
            >
              {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <Suspense fallback={<TabLoader />}>
        {ActiveComponent && <ActiveComponent />}
      </Suspense>
    </div>
  );
}
