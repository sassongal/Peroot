"use client";

import { useState, lazy, Suspense } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { cn } from "@/lib/utils";
import { TrendingUp, DollarSign, RefreshCw } from "lucide-react";

// ── Lazy-loaded tab components ────────────────────────────────────────────────

const RevenueTab = lazy(() => import("@/components/admin/tabs/RevenueTab"));
const CostsTab = lazy(() => import("@/components/admin/tabs/CostsTab"));

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = "revenue" | "costs";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS: Tab[] = [
  { id: "revenue", label: "הכנסות", icon: TrendingUp },
  { id: "costs", label: "עלויות", icon: DollarSign },
];

// ── Tab Fallback ──────────────────────────────────────────────────────────────

function TabFallback() {
  return (
    <div className="flex items-center justify-center py-40">
      <RefreshCw className="w-10 h-10 animate-spin text-zinc-700" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<TabId>("revenue");

  return (
    <AdminLayout>
      <div className="space-y-10 pb-20 select-none" dir="rtl">

        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div className="space-y-2 px-2">
          <h1 className="text-5xl font-black bg-gradient-to-l from-white to-zinc-600 bg-clip-text text-transparent tracking-tighter leading-none">
            Finance Center
          </h1>
          <p className="text-zinc-500 font-bold text-sm tracking-tight">
            ניהול הכנסות והוצאות
          </p>
        </div>

        {/* ── Tab Switcher ─────────────────────────────────────────────── */}
        <div className="flex gap-2 p-1.5 bg-zinc-950 border border-white/5 rounded-[28px] w-fit mx-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-2.5 px-6 py-3 rounded-[22px] transition-all duration-300",
                "font-black text-[10px] uppercase tracking-widest",
                activeTab === id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ──────────────────────────────────────────────── */}
        <Suspense fallback={<TabFallback />}>
          {activeTab === "revenue" && <RevenueTab />}
          {activeTab === "costs" && <CostsTab />}
        </Suspense>

      </div>
    </AdminLayout>
  );
}
