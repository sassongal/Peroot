"use client";

import { lazy, Suspense, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { cn } from "@/lib/utils";
import { HeartPulse, Radio, Bell, Database, RefreshCw } from "lucide-react";

// ── Lazy-loaded tab content ───────────────────────────────────────────────────

const HealthTab        = lazy(() => import("@/components/admin/tabs/HealthTab").then((m) => ({ default: m.HealthTab })));
const RealtimeTab      = lazy(() => import("@/components/admin/tabs/RealtimeTab").then((m) => ({ default: m.RealtimeTab })));
const NotificationsTab = lazy(() => import("@/components/admin/tabs/NotificationsTab").then((m) => ({ default: m.NotificationsTab })));
const DatabaseTab      = lazy(() => import("@/components/admin/tabs/DatabaseTab").then((m) => ({ default: m.DatabaseTab })));

// ── Tab config ────────────────────────────────────────────────────────────────

type TabId = "health" | "realtime" | "alerts" | "database";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "health",   label: "בריאות",     icon: HeartPulse },
  { id: "realtime", label: "זמן אמת",    icon: Radio      },
  { id: "alerts",   label: "התראות",     icon: Bell       },
  { id: "database", label: "מסד נתונים", icon: Database   },
];

// ── Tab loading fallback ──────────────────────────────────────────────────────

function TabSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <RefreshCw className="w-8 h-8 animate-spin text-zinc-700" />
      <span className="text-[10px] font-black text-zinc-800 uppercase tracking-[0.3em]">
        טוען...
      </span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OpsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("health");

  return (
    <AdminLayout>
      <div className="space-y-8 pb-24" dir="rtl">

        {/* ── Page header ── */}
        <div className="px-2 pt-2 space-y-1">
          <h1 className="text-4xl font-black bg-gradient-to-l from-white to-zinc-600 bg-clip-text text-transparent tracking-tighter leading-none">
            Operations
          </h1>
          <p className="text-zinc-600 font-bold text-sm tracking-wide">
            בריאות מערכת, זמן אמת, התראות ומסד נתונים
          </p>
        </div>

        {/* ── Tab switcher ── */}
        <div className="px-2">
          <div className="inline-flex items-center gap-1 p-1.5 rounded-[28px] bg-zinc-950 border border-white/5">
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-[22px] transition-all duration-300",
                    "font-black text-[10px] uppercase tracking-widest",
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
                  )}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Tab content ── */}
        <Suspense fallback={<TabSkeleton />}>
          {activeTab === "health"   && <HealthTab />}
          {activeTab === "realtime" && <RealtimeTab />}
          {activeTab === "alerts"   && <NotificationsTab />}
          {activeTab === "database" && <DatabaseTab />}
        </Suspense>
      </div>
    </AdminLayout>
  );
}
