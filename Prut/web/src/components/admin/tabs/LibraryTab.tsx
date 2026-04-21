"use client";

import { useState, useEffect } from "react";
import {
  Library,
  Database,
  Upload,
  Tags,
  Search,
  Filter,
  Plus,
  LayoutDashboard,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { getApiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";
import { BatchImportTool } from "@/components/admin/BatchImportTool";
import { CategoryManager } from "@/components/admin/CategoryManager";

type Tab = "overview" | "import" | "categories";

function StatItem({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="px-6 py-4 bg-white/2 border border-white/5 rounded-3xl flex items-center gap-4 transition-all hover:bg-white/5">
      <Icon className={cn("w-5 h-5", color)} />
      <div className="flex flex-col">
        <span className="text-[9px] font-black text-zinc-600 tracking-tighter uppercase">
          {label}
        </span>
        <span className="text-xl font-black text-white tabular-nums">{value}</span>
      </div>
    </div>
  );
}

function TabBtn({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
        active
          ? "bg-white/10 text-white shadow-xl"
          : "text-zinc-600 hover:text-zinc-300 hover:bg-white/5",
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

interface FeedbackStats {
  total: number;
  positive: number;
  negative: number;
  positiveRate: number;
}

export function LibraryTab() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [stats, setStats] = useState({ totalDocs: 0, categoryCount: 0 });
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(getApiPath("/api/admin/library-stats"));
        if (res.ok) setStats(await res.json());
      } catch {
        // silently ignore — keep zeros
      }
    };
    fetchStats();

    const fetchFeedback = async () => {
      try {
        const res = await fetch(getApiPath("/api/admin/feedback-stats"));
        if (res.ok) setFeedbackStats(await res.json());
      } catch {
        // silently ignore
      }
    };
    fetchFeedback();
  }, []);

  return (
    <div className="space-y-10 animate-in fade-in duration-1000 pb-20" dir="rtl">
      {/* Header Context */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-zinc-950/50 p-10 rounded-[48px] border border-white/5 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="space-y-2">
          <h2 className="text-5xl font-black bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent tracking-tighter uppercase">
            Public Repository
          </h2>
          <p className="text-zinc-500 font-medium tracking-wide">
            ניהול ספריה ציבורית, ייבוא נתונים רוחבי וארכיטקטורת קטגוריות
          </p>
        </div>

        <div className="flex gap-4 flex-wrap">
          <StatItem
            label="TOTAL PROMPTS"
            value={stats.totalDocs}
            icon={Database}
            color="text-blue-500"
          />
          <StatItem
            label="CATEGORIES"
            value={stats.categoryCount}
            icon={Tags}
            color="text-amber-500"
          />
          {feedbackStats && (
            <>
              <StatItem
                label="THUMBS UP"
                value={feedbackStats.positive}
                icon={ThumbsUp}
                color="text-emerald-500"
              />
              <StatItem
                label="THUMBS DOWN"
                value={feedbackStats.negative}
                icon={ThumbsDown}
                color="text-rose-500"
              />
            </>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 p-1.5 bg-zinc-950 border border-white/5 rounded-3xl w-fit">
        <TabBtn
          label="Overview"
          icon={LayoutDashboard}
          active={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
        />
        <TabBtn
          label="Batch Import"
          icon={Upload}
          active={activeTab === "import"}
          onClick={() => setActiveTab("import")}
        />
        <TabBtn
          label="Categories"
          icon={Tags}
          active={activeTab === "categories"}
          onClick={() => setActiveTab("categories")}
        />
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3 h-20 bg-zinc-950 border border-white/5 rounded-3xl flex items-center px-8 gap-4">
                <Search className="w-5 h-5 text-zinc-700" />
                <input
                  placeholder="חיפוש מהיר בספריה..."
                  className="flex-1 bg-transparent border-none outline-none text-white font-bold"
                />
                <Filter className="w-4 h-4 text-zinc-700" />
              </div>
              <button className="h-20 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest transition-all">
                <Plus className="w-5 h-5" />
                Create New
              </button>
            </div>

            <div className="p-20 text-center text-zinc-800 font-black uppercase tracking-[0.4em] text-[10px] border border-dashed border-white/5 rounded-[48px]">
              <Library className="w-12 h-12 mx-auto mb-6 opacity-5 text-blue-500" />
              Sequence List Loading...
            </div>
          </div>
        )}

        {activeTab === "import" && <BatchImportTool onComplete={() => setActiveTab("overview")} />}

        {activeTab === "categories" && <CategoryManager />}
      </div>
    </div>
  );
}
