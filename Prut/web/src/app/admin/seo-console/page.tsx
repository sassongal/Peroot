"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Globe,
  MousePointerClick,
  Eye,
  Target,
  FileSearch,
  Map,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type GscRow = { key: string; clicks: number; impressions: number; ctr: number; position: number };
type SortKey = "clicks" | "impressions" | "ctr" | "position";
type Tab = "queries" | "pages" | "sitemaps" | "inspect";

type Summary = {
  current: { clicks: number; impressions: number; ctr: number; position: number };
  prior: { clicks: number; impressions: number; ctr: number; position: number };
};

type Sitemap = {
  path?: string | null;
  lastSubmitted?: string | null;
  lastDownloaded?: string | null;
  isPending?: boolean | null;
  errors?: string | null;
  warnings?: string | null;
  contents?: { type?: string | null; submitted?: string | null; indexed?: string | null }[] | null;
};

type InspectResult = {
  indexStatusResult?: {
    verdict?: string | null;
    coverageState?: string | null;
    robotsTxtState?: string | null;
    indexingState?: string | null;
    lastCrawlTime?: string | null;
    crawledAs?: string | null;
    googleCanonical?: string | null;
  } | null;
  mobileUsabilityResult?: { verdict?: string | null } | null;
  richResultsResult?: { verdict?: string | null } | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAYS_OPTIONS = [7, 14, 28, 90];

function delta(current: number, prior: number): number {
  return prior === 0 ? 0 : parseFloat((((current - prior) / prior) * 100).toFixed(1));
}

function DeltaBadge({ pct }: { pct: number }) {
  if (pct === 0)
    return (
      <span className="text-zinc-500 text-xs flex items-center gap-0.5">
        <Minus className="w-3 h-3" />
        0%
      </span>
    );
  const pos = pct > 0;
  return (
    <span
      className={cn(
        "text-xs flex items-center gap-0.5 font-medium",
        pos ? "text-emerald-400" : "text-red-400",
      )}
    >
      {pos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {pos ? "+" : ""}
      {pct}%
    </span>
  );
}

function VerdictBadge({ verdict }: { verdict?: string | null }) {
  if (!verdict) return <span className="text-zinc-500 text-xs">—</span>;
  const v = verdict.toLowerCase();
  if (v === "pass" || v === "verdict_pass")
    return (
      <span className="flex items-center gap-1 text-emerald-400 text-xs">
        <CheckCircle className="w-3.5 h-3.5" />
        Pass
      </span>
    );
  if (v === "fail" || v === "verdict_fail")
    return (
      <span className="flex items-center gap-1 text-red-400 text-xs">
        <XCircle className="w-3.5 h-3.5" />
        Fail
      </span>
    );
  if (v === "partial")
    return (
      <span className="flex items-center gap-1 text-amber-400 text-xs">
        <AlertCircle className="w-3.5 h-3.5" />
        Partial
      </span>
    );
  return <span className="text-zinc-400 text-xs">{verdict}</span>;
}

// ── Summary cards ─────────────────────────────────────────────────────────────

function SummaryCards({ summary, loading }: { summary: Summary | null; loading: boolean }) {
  const metrics = [
    {
      label: "קליקים",
      icon: MousePointerClick,
      key: "clicks" as const,
      fmt: (v: number) => v.toLocaleString(),
    },
    {
      label: "חשיפות",
      icon: Eye,
      key: "impressions" as const,
      fmt: (v: number) => v.toLocaleString(),
    },
    { label: "CTR", icon: Target, key: "ctr" as const, fmt: (v: number) => `${v}%` },
    {
      label: "מיקום ממוצע",
      icon: Globe,
      key: "position" as const,
      fmt: (v: number) => `#${v}`,
      invert: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map(({ label, icon: Icon, key, fmt, invert }) => {
        const cur = summary?.current[key] ?? 0;
        const pri = summary?.prior[key] ?? 0;
        const pct = invert ? delta(pri, cur) : delta(cur, pri);
        return (
          <div key={key} className="bg-zinc-900/60 border border-white/5 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-widest">
                {label}
              </span>
              <Icon className="w-4 h-4 text-zinc-600" />
            </div>
            {loading ? (
              <div className="h-7 w-20 bg-zinc-800 rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-black text-white">{fmt(cur)}</div>
            )}
            <DeltaBadge pct={pct} />
          </div>
        );
      })}
    </div>
  );
}

// ── Sortable table ────────────────────────────────────────────────────────────

function GscTable({
  rows,
  loading,
  keyLabel,
  truncateKey = false,
}: {
  rows: GscRow[];
  loading: boolean;
  keyLabel: string;
  truncateKey?: boolean;
}) {
  const [sort, setSort] = useState<SortKey>("clicks");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");

  const toggle = (k: SortKey) => {
    if (sort === k) setDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSort(k);
      setDir("desc");
    }
  };

  const sorted = [...rows]
    .filter((r) => r.key.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (dir === "desc" ? b[sort] - a[sort] : a[sort] - b[sort]));

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sort !== k) return <ChevronDown className="w-3 h-3 opacity-20" />;
    return dir === "desc" ? (
      <ChevronDown className="w-3 h-3 text-blue-400" />
    ) : (
      <ChevronUp className="w-3 h-3 text-blue-400" />
    );
  };

  const cols: { label: string; key: SortKey; fmt: (v: number) => string }[] = [
    { label: "קליקים", key: "clicks", fmt: (v) => v.toLocaleString() },
    { label: "חשיפות", key: "impressions", fmt: (v) => v.toLocaleString() },
    { label: "CTR", key: "ctr", fmt: (v) => `${v}%` },
    { label: "מיקום", key: "position", fmt: (v) => `#${v}` },
  ];

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder={`חיפוש ${keyLabel}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-zinc-900 border border-white/5 rounded-xl py-2 pr-9 pl-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/40"
          dir="rtl"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/5">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-900/80 border-b border-white/5">
              <th className="text-right px-4 py-3 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                {keyLabel}
              </th>
              {cols.map((c) => (
                <th
                  key={c.key}
                  className="px-4 py-3 text-xs font-bold text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors whitespace-nowrap"
                  onClick={() => toggle(c.key)}
                >
                  <span className="flex items-center justify-center gap-1">
                    {c.label} <SortIcon k={c.key} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="px-4 py-3">
                    <div className="h-3 bg-zinc-800 rounded animate-pulse w-48" />
                  </td>
                  {cols.map((c) => (
                    <td key={c.key} className="px-4 py-3 text-center">
                      <div className="h-3 bg-zinc-800 rounded animate-pulse w-12 mx-auto" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-zinc-600">
                  אין תוצאות
                </td>
              </tr>
            ) : (
              sorted.slice(0, 50).map((row, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-2.5 text-zinc-300 font-mono text-xs max-w-xs">
                    {truncateKey ? (
                      <span title={row.key}>{row.key.replace("https://www.peroot.space", "")}</span>
                    ) : (
                      row.key
                    )}
                  </td>
                  {cols.map((c) => (
                    <td key={c.key} className="px-4 py-2.5 text-center text-zinc-400 font-medium">
                      {c.fmt(row[c.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!loading && sorted.length > 50 && (
        <p className="text-xs text-zinc-600 text-center">מציג 50 מתוך {sorted.length} תוצאות</p>
      )}
    </div>
  );
}

// ── Sitemaps tab ──────────────────────────────────────────────────────────────

function SitemapsPanel({ sitemaps, loading }: { sitemaps: Sitemap[]; loading: boolean }) {
  if (loading)
    return (
      <div className="flex justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-zinc-600" />
      </div>
    );
  if (!sitemaps.length)
    return <p className="text-zinc-600 text-center py-20">אין מפות אתר מוגדרות</p>;

  return (
    <div className="space-y-3">
      {sitemaps.map((s, i) => {
        const contents = s.contents ?? [];
        return (
          <div key={i} className="bg-zinc-900/60 border border-white/5 rounded-xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <code className="text-blue-400 text-xs break-all">{s.path}</code>
              <div className="flex gap-2 shrink-0">
                {s.errors && parseInt(s.errors) > 0 && (
                  <span className="text-xs text-red-400 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    {s.errors} שגיאות
                  </span>
                )}
                {s.warnings && parseInt(s.warnings) > 0 && (
                  <span className="text-xs text-amber-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {s.warnings} אזהרות
                  </span>
                )}
                {(!s.errors || s.errors === "0") && (!s.warnings || s.warnings === "0") && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    תקין
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
              {s.lastSubmitted && (
                <span>הוגש: {new Date(s.lastSubmitted).toLocaleDateString("he-IL")}</span>
              )}
              {s.lastDownloaded && (
                <span>הורד: {new Date(s.lastDownloaded).toLocaleDateString("he-IL")}</span>
              )}
            </div>
            {contents.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {contents.map((c, j) => (
                  <div key={j} className="bg-zinc-800/60 rounded-lg px-3 py-2 text-xs space-y-0.5">
                    <div className="text-zinc-400 font-medium capitalize">{c.type}</div>
                    <div className="text-zinc-500">
                      הוגש: {c.submitted ?? "—"} | מתוייג:{" "}
                      <span className="text-white font-bold">{c.indexed ?? "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── URL Inspector tab ─────────────────────────────────────────────────────────

function InspectPanel() {
  const [url, setUrl] = useState("https://www.peroot.space/");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InspectResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inspect = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/gsc?action=inspect&url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה");
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const idx = result?.indexStatusResult;
  const fields = idx
    ? [
        { label: "ורדיקט", value: idx.verdict },
        { label: "מצב אינדוקס", value: idx.indexingState },
        { label: "כיסוי", value: idx.coverageState },
        { label: "robots.txt", value: idx.robotsTxtState },
        {
          label: "סריקה אחרונה",
          value: idx.lastCrawlTime ? new Date(idx.lastCrawlTime).toLocaleString("he-IL") : null,
        },
        { label: "סרוק בתור", value: idx.crawledAs },
        { label: "קאנוניקל Google", value: idx.googleCanonical },
      ]
    : [];

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && inspect()}
          placeholder="https://www.peroot.space/..."
          className="flex-1 bg-zinc-900 border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/40 font-mono"
          dir="ltr"
        />
        <button
          onClick={inspect}
          disabled={loading}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <FileSearch className="w-4 h-4" />
          )}
          בדוק
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.label} className="space-y-1">
                <div className="text-xs text-zinc-500 font-medium">{f.label}</div>
                <div className="text-sm text-white font-medium">{f.value ?? "—"}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 pt-2 border-t border-white/5">
            <div className="space-y-1">
              <div className="text-xs text-zinc-500">Mobile Usability</div>
              <VerdictBadge verdict={result.mobileUsabilityResult?.verdict} />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-zinc-500">Rich Results</div>
              <VerdictBadge verdict={result.richResultsResult?.verdict} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "queries", label: "שאילתות", icon: Search },
  { key: "pages", label: "עמודים", icon: Globe },
  { key: "sitemaps", label: "Sitemaps", icon: Map },
  { key: "inspect", label: "בדיקת URL", icon: FileSearch },
];

export default function SeoConsolePage() {
  const [tab, setTab] = useState<Tab>("queries");
  const [days, setDays] = useState(28);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [queries, setQueries] = useState<GscRow[]>([]);
  const [pages, setPages] = useState<GscRow[]>([]);
  const [sitemaps, setSitemaps] = useState<Sitemap[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingTable, setLoadingTable] = useState(true);
  const [loadingSitemaps, setLoadingSitemaps] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async (d: number) => {
    setLoadingSummary(true);
    try {
      const res = await fetch(`/api/admin/gsc?action=summary&days=${d}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSummary(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const fetchTable = useCallback(async (d: number) => {
    setLoadingTable(true);
    try {
      const [qRes, pRes] = await Promise.all([
        fetch(`/api/admin/gsc?action=queries&days=${d}&limit=50`).then((r) => r.json()),
        fetch(`/api/admin/gsc?action=pages&days=${d}&limit=50`).then((r) => r.json()),
      ]);
      setQueries(qRes.rows ?? []);
      setPages(pRes.rows ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingTable(false);
    }
  }, []);

  const fetchSitemaps = useCallback(async () => {
    setLoadingSitemaps(true);
    try {
      const res = await fetch("/api/admin/gsc?action=sitemaps");
      const data = await res.json();
      setSitemaps(data.sitemaps ?? []);
    } finally {
      setLoadingSitemaps(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary(days);
    fetchTable(days);
    fetchSitemaps();
  }, [days, fetchSummary, fetchTable, fetchSitemaps]);

  return (
    <AdminLayout>
      <div className="space-y-8 animate-in fade-in duration-700 pb-20" dir="rtl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black bg-linear-to-r from-white to-zinc-500 bg-clip-text text-transparent tracking-tighter">
              SEO Console
            </h1>
            <p className="text-zinc-400 font-medium tracking-wide text-sm">
              Google Search Console — ביצועי חיפוש אורגני
            </p>
          </div>
          <div className="flex items-center gap-2">
            {DAYS_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                  days === d
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-900 text-zinc-400 hover:text-white border border-white/5",
                )}
              >
                {d}י
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error.includes("GOOGLE_SERVICE_ACCOUNT_KEY") || error.includes("403")
              ? "הגדרת GSC לא הושלמה. יש להוסיף את perootservice@peroot.iam.gserviceaccount.com כמשתמש ב-Google Search Console ולאפשר את Search Console API."
              : error}
          </div>
        )}

        {/* Summary cards */}
        <SummaryCards summary={summary} loading={loadingSummary} />

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900/60 border border-white/5 rounded-2xl p-1 w-fit">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                tab === key ? "bg-blue-600 text-white shadow-lg" : "text-zinc-400 hover:text-white",
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {tab === "queries" && (
            <GscTable rows={queries} loading={loadingTable} keyLabel="שאילתה" />
          )}
          {tab === "pages" && (
            <GscTable rows={pages} loading={loadingTable} keyLabel="עמוד" truncateKey />
          )}
          {tab === "sitemaps" && <SitemapsPanel sitemaps={sitemaps} loading={loadingSitemaps} />}
          {tab === "inspect" && <InspectPanel />}
        </div>
      </div>
    </AdminLayout>
  );
}
