"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { getApiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";
import {
  Shield,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Flag,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Tag,
  Eye,
  BookOpen,
} from "lucide-react";
import { logger } from "@/lib/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

type ModerationStatus = "pending" | "approved" | "removed" | "flagged";
type FilterTab = "all" | "pending" | "approved" | "flagged";

interface Prompt {
  id: string;
  user_id: string;
  created_at: string;
  personal_category: string | null;
  prompt: string;
  is_public: boolean;
  moderation_status: ModerationStatus;
  reviewed_at: string | null;
  author_display: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Stats {
  totalPublic: number;
  reviewedToday: number;
  flagged: number;
  removedThisMonth: number;
}

interface ApiResponse {
  prompts: Prompt[];
  pagination: Pagination;
  stats: Stats;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_CONFIG: Record<ModerationStatus, { label: string; color: string; dot: string }> = {
  pending: {
    label: "ממתין",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    dot: "bg-amber-400",
  },
  approved: {
    label: "אושר",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  removed: {
    label: "הוסר",
    color: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
    dot: "bg-zinc-500",
  },
  flagged: {
    label: "מסומן",
    color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    dot: "bg-rose-400",
  },
};

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "הכל" },
  { key: "pending", label: "ממתין לבדיקה" },
  { key: "approved", label: "מאושר" },
  { key: "flagged", label: "מסומן" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sub: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    rose: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  };
  return (
    <div className="group p-8 rounded-[36px] bg-zinc-950 border border-white/5 flex flex-col gap-6 transition-all duration-500 hover:border-white/10">
      <div className={cn("p-3.5 rounded-2xl border w-fit", colorMap[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="space-y-1">
        <div className="text-4xl font-black text-white tracking-tighter leading-none">{value}</div>
        <div className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">
          {label}
        </div>
        <div className="text-[9px] text-zinc-800 font-bold">{sub}</div>
      </div>
    </div>
  );
}

function PromptCard({
  prompt,
  onAction,
  acting,
}: {
  prompt: Prompt;
  onAction: (id: string, action: "approve" | "remove" | "flag") => void;
  acting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_CONFIG[prompt.moderation_status] ?? STATUS_CONFIG.pending;
  const isLong = prompt.prompt.length > 220;

  return (
    <div
      className={cn(
        "rounded-[36px] border bg-zinc-950/80 backdrop-blur-xl p-8 space-y-6 transition-all duration-300",
        prompt.moderation_status === "flagged"
          ? "border-rose-500/20"
          : "border-white/5 hover:border-white/10",
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status badge */}
          <span
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider",
              status.color,
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
            {status.label}
          </span>

          {/* Category badge */}
          {prompt.personal_category && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider">
              <Tag className="w-3 h-3" />
              {prompt.personal_category}
            </span>
          )}
        </div>

        {/* Date */}
        <div className="flex items-center gap-1.5 text-zinc-700 text-[10px] font-black shrink-0">
          <Clock className="w-3 h-3" />
          {fmtDate(prompt.created_at)}
        </div>
      </div>

      {/* Author */}
      <div className="flex items-center gap-2 text-zinc-600 text-xs font-bold">
        <User className="w-3.5 h-3.5" />
        <span>{prompt.author_display}</span>
        <span className="text-zinc-800">•</span>
        <span className="text-zinc-800 font-mono text-[10px]">{prompt.user_id.slice(0, 8)}...</span>
      </div>

      {/* Prompt text */}
      <div
        className={cn(
          "text-sm text-zinc-300 font-medium leading-relaxed bg-white/2 rounded-2xl p-5 border border-white/5",
          !expanded && isLong && "line-clamp-3",
        )}
      >
        {prompt.prompt}
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-[10px] font-black text-zinc-600 hover:text-zinc-400 uppercase tracking-wider transition-colors"
        >
          <Eye className="w-3 h-3" />
          {expanded ? "הצג פחות" : "הצג הכל"}
        </button>
      )}

      {/* Review timestamp if already reviewed */}
      {prompt.reviewed_at && (
        <div className="text-[9px] font-black text-zinc-700 uppercase tracking-wider">
          נבדק: {fmtDateTime(prompt.reviewed_at)}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-white/5">
        <button
          onClick={() => onAction(prompt.id, "approve")}
          disabled={acting || prompt.moderation_status === "approved"}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95",
            prompt.moderation_status === "approved"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-default"
              : "bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50",
          )}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          אישור
        </button>

        <button
          onClick={() => onAction(prompt.id, "flag")}
          disabled={acting || prompt.moderation_status === "flagged"}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95",
            prompt.moderation_status === "flagged"
              ? "bg-rose-500/10 border border-rose-500/20 text-rose-400 cursor-default"
              : "bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 disabled:opacity-50",
          )}
        >
          <Flag className="w-3.5 h-3.5" />
          סמן לבדיקה
        </button>

        <button
          onClick={() => onAction(prompt.id, "remove")}
          disabled={acting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-wider hover:bg-rose-500/20 transition-all active:scale-95 disabled:opacity-50 ms-auto"
        >
          <XCircle className="w-3.5 h-3.5" />
          הסר
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ModerationPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        filter,
        search,
      });
      const res = await fetch(getApiPath(`/api/admin/moderation?${params}`));
      if (!res.ok) throw new Error("Failed to fetch");
      const json: ApiResponse = await res.json();
      setData(json);
    } catch (err) {
      logger.error("[Moderation] fetch error:", err);
      showToast("שגיאה בטעינת הנתונים", false);
    } finally {
      setLoading(false);
    }
  }, [page, filter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounce search input
  function handleSearchChange(val: string) {
    setSearchInput(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 400);
  }

  function handleFilterChange(f: FilterTab) {
    setFilter(f);
    setPage(1);
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleAction(promptId: string, action: "approve" | "remove" | "flag") {
    setActingOn(promptId);
    try {
      const res = await fetch(getApiPath("/api/admin/moderation"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, prompt_id: promptId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      const actionLabels = {
        approve: "הפרומפט אושר",
        remove: "הפרומפט הוסר מהספרייה הציבורית",
        flag: "הפרומפט סומן לבדיקה",
      };
      showToast(actionLabels[action], true);
      await fetchData();
    } catch (err) {
      logger.error("[Moderation] action error:", err);
      showToast(err instanceof Error ? err.message : "פעולה נכשלה", false);
    } finally {
      setActingOn(null);
    }
  }

  const stats = data?.stats;
  const prompts = data?.prompts ?? [];
  const pagination = data?.pagination;

  return (
    <AdminLayout>
      <div className="space-y-10 animate-in fade-in duration-700 pb-20" dir="rtl">
        {/* Toast */}
        {toast && (
          <div
            className={cn(
              "fixed bottom-8 start-8 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm shadow-2xl transition-all animate-in slide-in-from-bottom-4 duration-300",
              toast.ok ? "bg-emerald-600 text-white" : "bg-rose-600 text-white",
            )}
          >
            {toast.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {toast.msg}
          </div>
        )}

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-zinc-950/50 p-10 rounded-[40px] border border-white/5">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <Shield className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em]">
                Content Moderation Layer
              </span>
            </div>
            <h1 className="text-5xl font-black bg-linear-to-l from-white to-zinc-600 bg-clip-text text-transparent tracking-tighter leading-none">
              Moderation Queue
            </h1>
            <p className="text-zinc-500 font-medium tracking-tight text-base max-w-xl">
              בדיקה וניהול תוכן ציבורי. אשר, הסר או סמן פרומפטים שפורסמו לספרייה הציבורית.
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-8 py-3 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3 shadow-2xl self-start md:self-auto"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </button>
        </div>

        {/* ── Summary Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatCard
            label="סה״כ פרומפטים ציבוריים"
            value={stats?.totalPublic ?? "-"}
            icon={BookOpen}
            color="blue"
            sub="Total public prompts"
          />
          <StatCard
            label="נסקרו היום"
            value={stats?.reviewedToday ?? "-"}
            icon={CheckCircle}
            color="emerald"
            sub="Reviewed today"
          />
          <StatCard
            label="מסומנים לבדיקה"
            value={stats?.flagged ?? "-"}
            icon={Flag}
            color="amber"
            sub="Flagged for review"
          />
          <StatCard
            label="הוסרו החודש"
            value={stats?.removedThisMonth ?? "-"}
            icon={XCircle}
            color="rose"
            sub="Removed this month"
          />
        </div>

        {/* ── Filter + Search bar ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-6 bg-zinc-950/50 rounded-[36px] border border-white/5">
          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleFilterChange(tab.key)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                  filter === tab.key
                    ? "bg-white text-black"
                    : "bg-white/5 text-zinc-500 hover:text-zinc-200 hover:bg-white/10",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-3 bg-zinc-900 border border-white/5 rounded-2xl px-4 py-2.5 flex-1 max-w-sm sm:ms-auto">
            <Search className="w-4 h-4 text-zinc-600 shrink-0" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="חיפוש בתוכן פרומפטים..."
              className="bg-transparent text-white text-sm font-medium placeholder:text-zinc-700 focus:outline-none flex-1 min-w-0"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setPage(1);
                }}
                className="text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Prompt Cards List ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <RefreshCw className="w-10 h-10 animate-spin text-rose-500/30" />
            <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">
              Loading Moderation Queue...
            </span>
          </div>
        ) : prompts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 rounded-[36px] border border-white/5 bg-zinc-950/50">
            <Shield className="w-12 h-12 text-zinc-800" />
            <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">
              אין פרומפטים תואמים
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {prompts.map((prompt) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                onAction={handleAction}
                acting={actingOn === prompt.id}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ─────────────────────────────────────────────────────── */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
              הקודם
            </button>

            <div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-950 border border-white/5 text-zinc-500 text-[10px] font-black uppercase tracking-wider">
              <span className="text-white">{page}</span>
              <span>/</span>
              <span>{pagination.totalPages}</span>
              <span className="text-zinc-700 ms-1">({pagination.total} פרומפטים)</span>
            </div>

            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages || loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-30"
            >
              הבא
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
