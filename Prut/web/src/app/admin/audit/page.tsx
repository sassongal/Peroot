"use client";

import { useState, lazy, Suspense } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { cn } from "@/lib/utils";
import { Shield, Activity, RefreshCw } from "lucide-react";

const ActivityFeedTab = lazy(() =>
  import("@/components/admin/tabs/ActivityFeedTab").then((m) => ({
    default: m.ActivityFeedTab,
  }))
);

const AdminAuditTab = lazy(() =>
  import("@/components/admin/tabs/AdminAuditTab").then((m) => ({
    default: m.AdminAuditTab,
  }))
);

type Tab = "activity" | "audit";

function TabLoader() {
  return (
    <div className="flex items-center justify-center py-32">
      <RefreshCw className="w-8 h-8 animate-spin text-blue-500/20" />
    </div>
  );
}

export default function AuditPage() {
  const [activeTab, setActiveTab] = useState<Tab>("activity");

  const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
    { id: "activity", label: "פעילות כללית", icon: Activity },
    { id: "audit", label: "ביקורת מנהלים", icon: Shield },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8 animate-in fade-in duration-700 pb-20" dir="rtl">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">
              Audit & Activity
            </span>
          </div>
          <h1 className="text-5xl font-black bg-linear-to-l from-white to-zinc-600 bg-clip-text text-transparent tracking-tighter leading-none">
            Audit Center
          </h1>
          <p className="text-zinc-500 font-medium tracking-tight text-lg">
            ניטור מלא של כל הפעילות וביקורת מנהלים
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1.5 bg-zinc-950/50 border border-white/5 rounded-[28px] gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-zinc-600 hover:text-zinc-300"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <Suspense fallback={<TabLoader />}>
          {activeTab === "activity" && <ActivityFeedTab />}
          {activeTab === "audit" && <AdminAuditTab />}
        </Suspense>
      </div>
    </AdminLayout>
  );
}
