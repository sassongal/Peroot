"use client";

import { lazy, Suspense, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { BarChart3, Globe, FlaskConical, Filter, RefreshCw, Target } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Lazy-loaded tab content ───────────────────────────────────────────────────

const AnalyticsOverviewTab = lazy(() => import("@/components/admin/tabs/AnalyticsOverviewTab"));
const TrafficTab            = lazy(() => import("@/components/admin/tabs/TrafficTab"));
const ExperimentsTab        = lazy(() => import("@/components/admin/tabs/ExperimentsTab"));
const FunnelTab             = lazy(() => import("@/components/admin/tabs/FunnelTab"));
const ScoringAnalyticsTab   = lazy(() => import("@/components/admin/tabs/ScoringAnalyticsTab").then((m) => ({ default: m.ScoringAnalyticsTab })));

// ── Tab definitions ───────────────────────────────────────────────────────────

type TabKey = "overview" | "traffic" | "features" | "funnel" | "scoring";

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ElementType;
}

const TABS: TabDef[] = [
  { key: "overview",  label: "סקירה כללית", icon: BarChart3     },
  { key: "traffic",   label: "תנועה",        icon: Globe         },
  { key: "features",  label: "פיצ'רים",      icon: FlaskConical  },
  { key: "funnel",    label: "משפך",          icon: Filter        },
  { key: "scoring",   label: "ציונים",        icon: Target        },
];

// ── Loading fallback ──────────────────────────────────────────────────────────

function TabSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <RefreshCw className="w-8 h-8 animate-spin text-white/10" />
      <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">טוען...</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsHubPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  return (
    <AdminLayout>
      <div className="space-y-8 animate-in fade-in duration-700 pb-20" dir="rtl">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent tracking-tighter">
              Analytics Hub
            </h1>
            <p className="text-zinc-400 font-medium tracking-wide text-sm">
              כל הנתונים במקום אחד — תנועה, מוצר, פיצ׳רים ומשפך
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/5 rounded-[28px] w-fit">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-[20px] transition-all duration-200",
                activeTab === key
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-zinc-600 hover:text-zinc-300"
              )}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="font-black text-[10px] uppercase tracking-widest whitespace-nowrap">{label}</span>
            </button>
          ))}
        </div>

        {/* Tab content — each rendered lazily, unmounted when inactive */}
        <Suspense fallback={<TabSkeleton />}>
          {activeTab === "overview"  && <AnalyticsOverviewTab />}
          {activeTab === "traffic"   && <TrafficTab />}
          {activeTab === "features"  && <ExperimentsTab />}
          {activeTab === "funnel"    && <FunnelTab />}
          {activeTab === "scoring"   && <ScoringAnalyticsTab />}
        </Suspense>
      </div>
    </AdminLayout>
  );
}
