"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Library,
  Database,
  Upload,
  Tags,
  Search,
  LayoutDashboard,
  ThumbsUp,
  ThumbsDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
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

interface LibraryPrompt {
  id: string;
  title: string;
  category_id: string | null;
  capability_mode: string | null;
  is_active: boolean;
  created_at: string;
  use_case: string | null;
}

export function LibraryTab() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [stats, setStats] = useState({ totalDocs: 0, categoryCount: 0 });
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);
  const [prompts, setPrompts] = useState<LibraryPrompt[]>([]);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [promptsLoading, setPromptsLoading] = useState(false);

  const fetchStats = useCallback(async (q: string, p: number) => {
    setPromptsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (q) params.set("search", q);
      const res = await fetch(getApiPath(`/api/admin/library-stats?${params}`));
      if (res.ok) {
        const data = await res.json();
        setStats({ totalDocs: data.totalDocs, categoryCount: data.categoryCount });
        setPrompts(data.prompts ?? []);
      }
    } catch {
      // silently ignore
    } finally {
      setPromptsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(search, page);
  }, [fetchStats, search, page]);

  useEffect(() => {
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
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Search */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPage(0);
                setSearch(searchInput);
              }}
              className="flex gap-4"
            >
              <div className="flex-1 h-14 bg-zinc-950 border border-white/5 rounded-2xl flex items-center px-6 gap-3">
                <Search className="w-4 h-4 text-zinc-700" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="חיפוש לפי שם..."
                  className="flex-1 bg-transparent border-none outline-none text-white font-bold text-sm"
                />
              </div>
              <button
                type="submit"
                className="px-6 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
              >
                חפש
              </button>
            </form>

            {/* Prompts table */}
            <div className="rounded-[32px] border border-white/5 bg-zinc-950 overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 px-8 py-4 border-b border-white/5 text-[9px] font-black text-zinc-700 uppercase tracking-widest">
                <div className="col-span-5">Title</div>
                <div className="col-span-3">Mode</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Created</div>
              </div>

              {promptsLoading ? (
                <div className="flex items-center justify-center h-40 text-zinc-700 text-xs font-black uppercase tracking-widest">
                  <Library className="w-5 h-5 animate-pulse mr-3" /> Loading...
                </div>
              ) : prompts.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-zinc-800 text-[10px] font-black uppercase tracking-widest">
                  No prompts found
                </div>
              ) : (
                prompts.map((p) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-12 gap-4 px-8 py-4 border-b border-white/5 hover:bg-white/2 transition-all duration-200 items-center"
                  >
                    <div className="col-span-5 font-bold text-zinc-300 text-sm truncate">
                      {p.title}
                    </div>
                    <div className="col-span-3">
                      {p.capability_mode && (
                        <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-wide">
                          {p.capability_mode.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5">
                      {p.is_active ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-zinc-700" />
                      )}
                      <span
                        className={cn(
                          "text-[9px] font-black uppercase",
                          p.is_active ? "text-emerald-500" : "text-zinc-700",
                        )}
                      >
                        {p.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="col-span-2 text-zinc-700 text-[10px] font-bold">
                      {new Date(p.created_at).toLocaleDateString("he-IL")}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">
                {stats.totalDocs} prompts total
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-2 rounded-xl bg-zinc-900 border border-white/5 text-zinc-500 disabled:opacity-30 hover:text-white transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="px-4 py-2 rounded-xl bg-zinc-900 border border-white/5 text-zinc-500 text-[10px] font-black">
                  {page + 1}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={prompts.length < 20}
                  className="p-2 rounded-xl bg-zinc-900 border border-white/5 text-zinc-500 disabled:opacity-30 hover:text-white transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "import" && <BatchImportTool onComplete={() => setActiveTab("overview")} />}

        {activeTab === "categories" && <CategoryManager />}
      </div>
    </div>
  );
}
