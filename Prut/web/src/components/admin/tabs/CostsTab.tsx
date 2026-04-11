"use client";

import { useState, useEffect, useCallback } from "react";
import { getApiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DollarSign,
  TrendingUp,
  Server,
  Zap,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Plus,
  RefreshCw,
  X,
  Download,
} from "lucide-react";
import { logger } from "@/lib/logger";

// ── Types ────────────────────────────────────────────────────────────────────

interface ProviderRow {
  provider: string;
  model: string;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  requestCount: number;
}

interface UserCostRow {
  user_id: string;
  totalCost: number;
  requestCount: number;
}

interface MonthlyRow {
  month: string;
  llmCost: number;
  manualCost: number;
}

interface ManualCostEntry {
  id: string;
  service_name: string;
  amount_usd: number;
  billing_period: string;
  notes?: string | null;
  created_at?: string;
}

interface CostsData {
  summary: {
    totalCost: number;
    llmCost: number;
    manualCost: number;
    avgCostPerPrompt: number;
  };
  byProvider: ProviderRow[];
  byUser: UserCostRow[];
  monthly: MonthlyRow[];
}

interface CoverageData {
  endpoints: { endpoint: string; lastSeen: string | null }[];
  untracked: string[];
  windowHours: number;
  cacheStats: {
    totalRequests: number;
    cacheHits: number;
    hitRate: number;
    tokensSavedInput: number;
    tokensSavedOutput: number;
  };
}

type SortKey = keyof ProviderRow;
type SortDir = "asc" | "desc";

const SERVICE_OPTIONS = [
  "Vercel",
  "Supabase",
  "Upstash",
  "Resend",
  "Sentry",
  "Domain",
  "Other",
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

function fmtCost(n: number) {
  return `$${n.toFixed(4)}`;
}

function fmtCostShort(n: number) {
  return `$${n.toFixed(2)}`;
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function defaultFrom() {
  const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) {
    toast.error("אין נתונים לייצוא");
    return;
  }
  const BOM = "\uFEFF"; // UTF-8 BOM for Hebrew
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map((row) =>
    Object.values(row)
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = BOM + [headers, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`יוצאו ${data.length} שורות`);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function UntrackedEndpointsWarning({ untracked, windowHours }: { untracked: string[]; windowHours: number }) {
  if (untracked.length === 0) return null;
  return (
    <div className="p-6 rounded-[32px] bg-amber-950/20 border border-amber-500/20 flex items-start gap-4">
      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
        <TrendingUp className="w-4 h-4" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em]">
          Untracked Endpoints
        </div>
        <div className="text-sm text-amber-200/80 font-medium">
          No <code className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 text-xs">api_usage_logs</code> rows in the last {windowHours}h for:{" "}
          <span className="font-bold">{untracked.join(", ")}</span>
        </div>
        <div className="text-[11px] text-amber-500/60">
          Either nobody used the feature, or <code>trackApiUsage()</code> is not wired up. Cost dashboard may undercount.
        </div>
      </div>
    </div>
  );
}

function CacheHitRateCard({ stats }: { stats: CoverageData["cacheStats"] }) {
  const pct = (stats.hitRate * 100).toFixed(1);
  const tokensSaved = stats.tokensSavedInput + stats.tokensSavedOutput;
  return (
    <div className="group p-8 rounded-[40px] bg-zinc-950 border border-emerald-500/10 flex flex-col gap-6 transition-all duration-700 hover:border-emerald-500/20">
      <div className="flex justify-between items-start">
        <div className="p-2.5 rounded-xl border bg-emerald-500/5 border-emerald-500/20 text-emerald-400">
          <Zap className="w-4 h-4" />
        </div>
        <div className="px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/10 text-[8px] font-black text-emerald-500 tracking-[0.2em] uppercase">
          24h
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-4xl font-black text-white tracking-tighter transition-transform duration-700 group-hover:scale-110 group-hover:translate-x-2 origin-right leading-none">
          {stats.totalRequests > 0 ? `${pct}%` : "—"}
        </div>
        <div className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">
          Cache Hit Rate
        </div>
        <div className="text-[9px] text-zinc-800 font-bold">
          {stats.cacheHits.toLocaleString()}/{stats.totalRequests.toLocaleString()} requests · ~{tokensSaved.toLocaleString()} tokens saved
        </div>
      </div>
    </div>
  );
}

function CostCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  sub: string;
}) {
  const colors: Record<string, string> = {
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20 group-hover:bg-blue-500 group-hover:text-white",
    purple:
      "text-purple-500 bg-purple-500/10 border-purple-500/20 group-hover:bg-purple-500 group-hover:text-white",
    emerald:
      "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white",
    amber:
      "text-amber-500 bg-amber-500/10 border-amber-500/20 group-hover:bg-amber-500 group-hover:text-white",
  };

  return (
    <div className="group p-8 rounded-[40px] bg-zinc-950 border border-white/5 flex flex-col gap-6 transition-all duration-700 hover:border-white/10 hover:shadow-2xl">
      <div className="flex justify-between items-start">
        <div
          className={cn(
            "p-4 rounded-2xl border transition-all duration-700 shadow-2xl",
            colors[color]
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div className="px-3 py-1 rounded-full bg-zinc-900 border border-white/5 text-[8px] font-black text-zinc-700 tracking-[0.2em] uppercase">
          MTD
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-4xl font-black text-white tracking-tighter transition-transform duration-700 group-hover:scale-110 group-hover:translate-x-2 origin-right leading-none">
          {value}
        </div>
        <div className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">
          {label}
        </div>
        <div className="text-[9px] text-zinc-800 font-bold">{sub}</div>
      </div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  color,
  title,
  sub,
}: {
  icon: React.ElementType;
  color: string;
  title: string;
  sub: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };

  return (
    <div className="flex items-center gap-4">
      <div className={cn("p-2.5 rounded-xl border", colorMap[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <h2 className="text-xl font-black text-white tracking-tight">{title}</h2>
        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">{sub}</p>
      </div>
    </div>
  );
}

// ── Tab Component ─────────────────────────────────────────────────────────────

export default function CostsTab() {
  // Filter state
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(todayISO());
  const [provider, setProvider] = useState("");

  // Data state
  const [data, setData] = useState<CostsData | null>(null);
  const [manualEntries, setManualEntries] = useState<ManualCostEntry[]>([]);
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingManual, setLoadingManual] = useState(true);

  // Sort state for provider table
  const [sortKey, setSortKey] = useState<SortKey>("totalCost");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Add cost form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [formService, setFormService] = useState<string>(SERVICE_OPTIONS[0]);
  const [formAmount, setFormAmount] = useState("");
  const [formPeriod, setFormPeriod] = useState(currentMonth());
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchCosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: new Date(from).toISOString(),
        to: new Date(to + "T23:59:59").toISOString(),
      });
      if (provider) params.set("provider", provider);

      const res = await fetch(getApiPath(`/api/admin/costs?${params}`));
      if (!res.ok) throw new Error("Failed to fetch costs");
      const json: CostsData = await res.json();
      setData(json);
    } catch (err) {
      logger.error(err);
      toast.error("Failed to load cost data");
    } finally {
      setLoading(false);
    }
  }, [from, to, provider]);

  const fetchManualCosts = useCallback(async () => {
    setLoadingManual(true);
    try {
      const res = await fetch(getApiPath("/api/admin/costs/manual"));
      if (!res.ok) throw new Error("Failed to fetch manual costs");
      const json: { data: ManualCostEntry[] } = await res.json();
      setManualEntries(json.data ?? []);
    } catch (err) {
      logger.error(err);
      toast.error("Failed to load manual costs");
    } finally {
      setLoadingManual(false);
    }
  }, []);

  const fetchCoverage = useCallback(async () => {
    try {
      const res = await fetch(getApiPath("/api/admin/costs/coverage"));
      if (!res.ok) throw new Error("Failed to fetch coverage");
      const json: CoverageData = await res.json();
      setCoverage(json);
    } catch (err) {
      // Coverage is non-critical — swallow errors rather than toasting
      logger.warn("[CostsTab] coverage fetch failed:", err);
    }
  }, []);

  useEffect(() => {
    fetchCosts();
    fetchManualCosts();
    fetchCoverage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sortedByProvider = [...(data?.byProvider ?? [])].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === "number" && typeof bv === "number") {
      return sortDir === "asc" ? av - bv : bv - av;
    }
    return sortDir === "asc"
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });

  const maxUserCost = data?.byUser?.[0]?.totalCost ?? 1;

  async function handleAddManualCost(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(formAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error("Enter a valid non-negative amount");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(getApiPath("/api/admin/costs/manual"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_name: formService,
          amount_usd: amount,
          billing_period: formPeriod,
          notes: formNotes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      toast.success("Manual cost saved");
      setShowAddForm(false);
      setFormAmount("");
      setFormNotes("");
      fetchManualCosts();
      fetchCosts();
    } catch (err: unknown) {
      logger.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to save cost");
    } finally {
      setSubmitting(false);
    }
  }

  const maxMonthly = Math.max(
    ...(data?.monthly ?? []).map((m) => m.llmCost + m.manualCost),
    0.001
  );

  return (
    <div
      className="space-y-12 animate-in fade-in duration-1000 pb-20 select-none"
      dir="rtl"
    >
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-zinc-950/50 p-10 rounded-[40px] border border-white/5">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">
              Financial Intelligence Layer
            </span>
          </div>
          <h1 className="text-6xl font-black bg-linear-to-l from-white to-zinc-600 bg-clip-text text-transparent tracking-tighter leading-none">
            Cost Analysis
          </h1>
          <p className="text-zinc-500 font-medium tracking-tight text-lg max-w-xl">
            ניתוח עלויות LLM ותשתית. מעקב בזמן אמת אחר הוצאות לפי ספק, מודל ומשתמש.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              const rows = sortedByProvider.map((r) => ({
                ספק: r.provider,
                מודל: r.model,
                בקשות: r.requestCount,
                "טוקנים_קלט": r.totalInputTokens,
                "טוקנים_פלט": r.totalOutputTokens,
                "עלות_כוללת_$": r.totalCost.toFixed(4),
              }));
              exportToCSV(
                rows as Record<string, unknown>[],
                `peroot_costs_${new Date().toISOString().slice(0, 10)}.csv`
              );
            }}
            disabled={!data || sortedByProvider.length === 0}
            className="px-6 py-3 bg-white/3 border border-white/5 text-zinc-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all flex items-center gap-3 rounded-2xl disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            ייצוא CSV
          </button>
          <button
            onClick={() => {
              fetchCosts();
              fetchManualCosts();
            }}
            disabled={loading}
            className="px-8 py-3 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3 shadow-2xl"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* ── Coverage / Cache health ── */}
      {coverage && (
        <div className="space-y-6 px-2">
          <UntrackedEndpointsWarning untracked={coverage.untracked} windowHours={coverage.windowHours} />
        </div>
      )}

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 px-2">
        <CostCard
          label="Total MTD"
          value={data ? fmtCostShort(data.summary.totalCost) : "-"}
          icon={TrendingUp}
          color="emerald"
          sub="LLM + Infrastructure"
        />
        <CostCard
          label="LLM Costs"
          value={data ? fmtCostShort(data.summary.llmCost) : "-"}
          icon={Zap}
          color="blue"
          sub="Auto-tracked via API logs"
        />
        <CostCard
          label="Infrastructure"
          value={data ? fmtCostShort(data.summary.manualCost) : "-"}
          icon={Server}
          color="purple"
          sub="Manual entries"
        />
        <CostCard
          label="Cost / Prompt"
          value={data ? fmtCost(data.summary.avgCostPerPrompt) : "-"}
          icon={DollarSign}
          color="amber"
          sub="Average LLM cost"
        />
        {coverage && <CacheHitRateCard stats={coverage.cacheStats} />}
      </div>

      {/* ── Date Filter ── */}
      <div className="flex flex-wrap gap-4 p-6 bg-zinc-950/50 rounded-[36px] border border-white/5 mx-2 items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em]">
            From
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-zinc-900 border border-white/5 text-white rounded-2xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-emerald-500/40 transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em]">
            To
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-zinc-900 border border-white/5 text-white rounded-2xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-emerald-500/40 transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em]">
            Provider
          </label>
          <input
            type="text"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="All providers"
            className="bg-zinc-900 border border-white/5 text-white rounded-2xl px-4 py-2.5 text-sm font-bold placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/40 transition-colors w-44"
          />
        </div>
        <button
          onClick={fetchCosts}
          disabled={loading}
          className="px-8 py-2.5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all active:scale-95 disabled:opacity-50 mt-auto"
        >
          Apply
        </button>
      </div>

      {/* ── LLM Cost Breakdown Table ── */}
      <div className="space-y-4 px-2">
        <SectionTitle icon={Zap} color="blue" title="LLM Cost Breakdown" sub="By provider and model" />

        <div className="rounded-[48px] border border-white/5 bg-zinc-950/80 backdrop-blur-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto min-w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/5">
                  {(
                    [
                      { key: "provider", label: "Provider" },
                      { key: "model", label: "Model" },
                      { key: "requestCount", label: "Requests" },
                      { key: "totalInputTokens", label: "Input Tokens" },
                      { key: "totalOutputTokens", label: "Output Tokens" },
                      { key: "totalCost", label: "Total Cost" },
                    ] as { key: SortKey; label: string }[]
                  ).map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className="px-8 py-7 text-right text-[10px] font-black uppercase tracking-[0.25em] text-zinc-600 cursor-pointer hover:text-zinc-400 transition-colors select-none"
                    >
                      <span className="flex items-center gap-1.5 justify-end">
                        {label}
                        {sortKey === key ? (
                          sortDir === "asc" ? (
                            <ChevronUp className="w-3 h-3 text-blue-400" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-blue-400" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-28 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <RefreshCw className="w-10 h-10 animate-spin text-blue-500/20" />
                        <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">
                          Loading Data Stream...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : sortedByProvider.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-8 py-28 text-center text-zinc-800 font-black uppercase tracking-widest text-[9px]"
                    >
                      No LLM usage in this period
                    </td>
                  </tr>
                ) : (
                  sortedByProvider.map((row, i) => (
                    <tr
                      key={`${row.provider}-${row.model}-${i}`}
                      className="group hover:bg-white/2 transition-all duration-300"
                    >
                      <td className="px-8 py-5">
                        <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider">
                          {row.provider}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-zinc-300 font-bold text-sm">
                        {row.model}
                      </td>
                      <td className="px-8 py-5 text-zinc-400 font-bold text-sm tabular-nums">
                        {fmt(row.requestCount)}
                      </td>
                      <td className="px-8 py-5 text-zinc-400 font-bold text-sm tabular-nums">
                        {fmt(row.totalInputTokens)}
                      </td>
                      <td className="px-8 py-5 text-zinc-400 font-bold text-sm tabular-nums">
                        {fmt(row.totalOutputTokens)}
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-emerald-400 font-black text-base tabular-nums">
                          {fmtCost(row.totalCost)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Top Users by Cost ── */}
      <div className="space-y-4 px-2">
        <SectionTitle
          icon={TrendingUp}
          color="amber"
          title="Top Users by Cost"
          sub="Highest API cost generators in the selected period"
        />

        <div className="rounded-[48px] border border-white/5 bg-zinc-950/80 backdrop-blur-3xl overflow-hidden shadow-2xl p-8 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-500/20" />
            </div>
          ) : (data?.byUser?.length ?? 0) === 0 ? (
            <p className="text-center text-zinc-800 font-black uppercase tracking-widest text-[9px] py-16">
              No user data in this period
            </p>
          ) : (
            (data?.byUser ?? []).map((u, i) => (
              <div key={u.user_id} className="flex items-center gap-6 group">
                <span className="text-[9px] font-black text-zinc-700 w-5 text-center">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-0.5 w-52 shrink-0">
                  <span className="text-xs font-black text-zinc-300 truncate">
                    {u.user_id.slice(0, 24)}…
                  </span>
                  <span className="text-[9px] text-zinc-700 font-bold uppercase">
                    {fmt(u.requestCount)} requests
                  </span>
                </div>
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-700"
                    style={{
                      width: `${(u.totalCost / maxUserCost) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-amber-400 font-black text-sm tabular-nums w-24 text-right shrink-0">
                  {fmtCost(u.totalCost)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Manual Costs ── */}
      <div className="space-y-4 px-2">
        <div className="flex items-center justify-between">
          <SectionTitle
            icon={Server}
            color="purple"
            title="Manual Costs"
            sub="Infrastructure & service expenses"
          />
          <div className="flex gap-3">
            <button
              onClick={() => {
                const rows = manualEntries.map((e) => ({
                  שירות: e.service_name,
                  "סכום_$": e.amount_usd.toFixed(2),
                  תקופה: e.billing_period,
                  הערות: e.notes || "",
                  "נוסף_בתאריך": e.created_at
                    ? new Date(e.created_at).toLocaleDateString("he-IL")
                    : "",
                }));
                exportToCSV(
                  rows as Record<string, unknown>[],
                  `peroot_manual_costs_${new Date().toISOString().slice(0, 10)}.csv`
                );
              }}
              disabled={manualEntries.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/3 border border-white/5 text-zinc-500 hover:text-zinc-200 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              ייצוא CSV
            </button>
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                showAddForm
                  ? "bg-white/5 border border-white/10 text-zinc-400 hover:text-white"
                  : "bg-purple-600 text-white hover:bg-purple-500 shadow-2xl shadow-purple-600/20"
              )}
            >
              {showAddForm ? (
                <>
                  <X className="w-4 h-4" /> Cancel
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Add Cost
                </>
              )}
            </button>
          </div>
        </div>

        {/* Inline Add Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddManualCost}
            className="rounded-[40px] border border-purple-500/20 bg-purple-500/5 p-8 space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em]">
                  Service
                </label>
                <select
                  value={formService}
                  onChange={(e) => setFormService(e.target.value)}
                  className="bg-zinc-900 border border-white/5 text-white rounded-2xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-purple-500/40 transition-colors"
                >
                  {SERVICE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em]">
                  Amount (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="bg-zinc-900 border border-white/5 text-white rounded-2xl px-4 py-2.5 text-sm font-bold placeholder:text-zinc-700 focus:outline-none focus:border-purple-500/40 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em]">
                  Billing Period
                </label>
                <input
                  type="month"
                  value={formPeriod}
                  onChange={(e) => setFormPeriod(e.target.value)}
                  required
                  className="bg-zinc-900 border border-white/5 text-white rounded-2xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-purple-500/40 transition-colors"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em]">
                  Notes
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="bg-zinc-900 border border-white/5 text-white rounded-2xl px-4 py-2.5 text-sm font-bold placeholder:text-zinc-700 focus:outline-none focus:border-purple-500/40 transition-colors"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-10 py-3 bg-purple-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-purple-500 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {submitting ? "Saving..." : "Save Cost Entry"}
              </button>
            </div>
          </form>
        )}

        {/* Manual Costs Table */}
        <div className="rounded-[48px] border border-white/5 bg-zinc-950/80 backdrop-blur-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto min-w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/5">
                  {["Service", "Amount", "Period", "Notes", "Date Added"].map((h) => (
                    <th
                      key={h}
                      className="px-8 py-7 text-right text-[10px] font-black uppercase tracking-[0.25em] text-zinc-600"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loadingManual ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-16 text-center">
                      <RefreshCw className="w-8 h-8 animate-spin text-purple-500/20 mx-auto" />
                    </td>
                  </tr>
                ) : manualEntries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-8 py-16 text-center text-zinc-800 font-black uppercase tracking-widest text-[9px]"
                    >
                      No manual cost entries yet
                    </td>
                  </tr>
                ) : (
                  manualEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="group hover:bg-white/2 transition-all duration-300"
                    >
                      <td className="px-8 py-5">
                        <span className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-wider">
                          {entry.service_name}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-emerald-400 font-black text-base tabular-nums">
                          {fmtCostShort(entry.amount_usd)}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-zinc-400 font-bold text-sm">
                        {entry.billing_period}
                      </td>
                      <td className="px-8 py-5 text-zinc-600 font-medium text-sm max-w-xs truncate">
                        {entry.notes || "-"}
                      </td>
                      <td className="px-8 py-5 text-zinc-600 font-bold text-xs">
                        {entry.created_at
                          ? new Date(entry.created_at).toLocaleDateString("en-US")
                          : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Monthly Trend Chart ── */}
      <div className="space-y-4 px-2">
        <SectionTitle
          icon={TrendingUp}
          color="emerald"
          title="Monthly Cost Trend"
          sub="Last 12 months - LLM (blue) + Infrastructure (purple)"
        />

        <div className="rounded-[48px] border border-white/5 bg-zinc-950/80 backdrop-blur-3xl p-10 shadow-2xl">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-10 h-10 animate-spin text-emerald-500/20" />
            </div>
          ) : (
            <div className="flex items-end gap-3 h-56 overflow-x-auto pb-6">
              {(data?.monthly ?? []).map((m) => {
                const total = m.llmCost + m.manualCost;
                const totalH = (total / maxMonthly) * 100;
                const llmH = (m.llmCost / maxMonthly) * 100;
                const manualH = (m.manualCost / maxMonthly) * 100;
                const monthLabel = m.month.slice(5);

                return (
                  <div
                    key={m.month}
                    className="flex flex-col items-center gap-2 group flex-1 min-w-12"
                    title={`${m.month}: LLM $${m.llmCost.toFixed(4)} + Infra $${m.manualCost.toFixed(4)} = $${total.toFixed(4)}`}
                  >
                    <div
                      className="w-full relative rounded-t-xl overflow-hidden transition-all duration-700"
                      style={{ height: `${Math.max(totalH, 2)}%` }}
                    >
                      <div
                        className="absolute bottom-0 w-full bg-blue-600 group-hover:bg-blue-500 transition-colors"
                        style={{
                          height: total > 0 ? `${(llmH / totalH) * 100}%` : "50%",
                        }}
                      />
                      {m.manualCost > 0 && (
                        <div
                          className="absolute top-0 w-full bg-purple-600 group-hover:bg-purple-500 transition-colors"
                          style={{
                            height: `${(manualH / totalH) * 100}%`,
                          }}
                        />
                      )}
                    </div>
                    <span className="text-[9px] font-black text-zinc-700 uppercase tracking-wider group-hover:text-zinc-400 transition-colors">
                      {monthLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center gap-6 pt-4 border-t border-white/5 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-blue-600" />
              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                LLM Cost
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-purple-600" />
              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                Infrastructure
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
