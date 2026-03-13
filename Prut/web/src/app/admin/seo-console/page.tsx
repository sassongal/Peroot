"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { getApiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import {
  Globe,
  FileText,
  BookOpen,
  Tag,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
  Search,
  TrendingUp,
  BarChart3,
  ExternalLink,
  ArrowUpRight,
  Layers,
  Map,
  ShieldCheck,
  Smartphone,
  Rss,
  Library,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  label: string;
  labelHe: string;
  status: boolean;
  detail: string | null;
}

interface WeeklyDataPoint {
  weekStart: string;
  weekLabel: string;
  prompts: number;
  blogPosts: number;
  total: number;
}

interface ContentMetrics {
  totalPublicPages: number;
  publicPrompts: number;
  blogPosts: number;
  blogCategories: number;
  totalUsers: number;
  knownRoutes: number;
  avgWeeklyContent: number;
}

interface SEOData {
  seoHealthScore: number;
  passedChecks: number;
  totalChecks: number;
  contentMetrics: ContentMetrics;
  weeklyData: WeeklyDataPoint[];
  checklist: ChecklistItem[];
  gscConnected: boolean;
  gscSiteUrl: string | null;
  recentBlogList: { id: string; created_at: string }[];
  generatedAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-rose-400";
}

function scoreGradient(score: number) {
  if (score >= 80) return "from-emerald-600 to-emerald-400";
  if (score >= 50) return "from-amber-600 to-amber-400";
  return "from-rose-600 to-rose-400";
}

function scoreLabel(score: number) {
  if (score >= 80) return "מצוין";
  if (score >= 60) return "טוב";
  if (score >= 40) return "בינוני";
  return "טעון שיפור";
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-lg bg-white/[0.04]", className)} />
  );
}

function PageSkeleton() {
  return (
    <AdminLayout>
      <div className="space-y-10 pb-20" dir="rtl">
        <div className="space-y-3">
          <Skeleton className="h-14 w-80" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-8 rounded-[36px] bg-zinc-950 border border-white/5 space-y-6"
            >
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
          ))}
        </div>
        <Skeleton className="h-96 rounded-[36px]" />
        <Skeleton className="h-64 rounded-[36px]" />
      </div>
    </AdminLayout>
  );
}

type AccentColor = "blue" | "purple" | "emerald" | "amber" | "rose" | "cyan";

const ACCENT_MAP: Record<
  AccentColor,
  { icon: string; border: string; bg: string }
> = {
  blue: {
    icon: "text-blue-400",
    border: "hover:border-blue-500/30",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  purple: {
    icon: "text-purple-400",
    border: "hover:border-purple-500/30",
    bg: "bg-purple-500/10 border-purple-500/20",
  },
  emerald: {
    icon: "text-emerald-400",
    border: "hover:border-emerald-500/30",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  amber: {
    icon: "text-amber-400",
    border: "hover:border-amber-500/30",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  rose: {
    icon: "text-rose-400",
    border: "hover:border-rose-500/30",
    bg: "bg-rose-500/10 border-rose-500/20",
  },
  cyan: {
    icon: "text-cyan-400",
    border: "hover:border-cyan-500/30",
    bg: "bg-cyan-500/10 border-cyan-500/20",
  },
};

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: AccentColor;
}) {
  const a = ACCENT_MAP[color];
  return (
    <div
      className={cn(
        "p-8 rounded-[36px] bg-zinc-950 border border-white/5 flex flex-col gap-6",
        "transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl",
        a.border
      )}
    >
      <div className={cn("p-4 rounded-2xl border w-fit", a.bg, a.icon)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="space-y-1">
        <div className="text-4xl font-black text-white tracking-tighter tabular-nums">
          {value}
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">
          {label}
        </div>
        {sub && (
          <div className="text-[10px] font-bold text-zinc-600 pt-0.5">{sub}</div>
        )}
      </div>
    </div>
  );
}

// ── SEO Health Score Ring ──────────────────────────────────────────────────────

function HealthScoreRing({
  score,
  passed,
  total,
}: {
  score: number;
  passed: number;
  total: number;
}) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-36 h-36">
        <svg
          className="w-full h-full -rotate-90"
          viewBox="0 0 120 120"
        >
          {/* Track */}
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="8"
          />
          {/* Progress */}
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke={
              score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#f43f5e"
            }
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "text-4xl font-black tabular-nums",
              scoreColor(score)
            )}
          >
            {score}
          </span>
          <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
            /100
          </span>
        </div>
      </div>
      <div className="text-center space-y-0.5">
        <div className={cn("text-sm font-black", scoreColor(score))}>
          {scoreLabel(score)}
        </div>
        <div className="text-[10px] text-zinc-600 font-bold">
          {passed}/{total} בדיקות עברו
        </div>
      </div>
    </div>
  );
}

// ── Content Calendar (weekly bar chart) ───────────────────────────────────────

function ContentCalendar({
  weeklyData,
}: {
  weeklyData: WeeklyDataPoint[];
}) {
  const max = Math.max(...weeklyData.map((w) => w.total), 1);
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="p-8 rounded-[36px] bg-zinc-950 border border-white/5 flex flex-col gap-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/[0.03] to-transparent pointer-events-none" />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/5 text-emerald-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">
              Content Calendar
            </h3>
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">
              תוכן פעיל לפי שבוע - 12 שבועות אחרונים
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
              Prompts
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
              Blog
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative flex items-end gap-2 h-48">
        {weeklyData.map((week, i) => {
          const totalHeight = max > 0 ? (week.total / max) * 100 : 0;
          const promptPct =
            week.total > 0 ? (week.prompts / week.total) * totalHeight : 0;
          const blogPct = totalHeight - promptPct;
          const isHovered = hovered === i;

          return (
            <div
              key={week.weekStart}
              className="flex-1 flex flex-col items-center gap-2 group h-full justify-end"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute -top-12 bg-zinc-800 text-white text-[10px] font-black px-3 py-2 rounded-xl border border-white/10 shadow-2xl z-10 pointer-events-none whitespace-nowrap">
                  {week.weekLabel}: {week.prompts} prompts + {week.blogPosts} posts
                </div>
              )}

              {/* Stacked bar */}
              <div className="w-full flex flex-col justify-end gap-0 rounded-t-lg overflow-hidden relative">
                {/* Blog posts portion */}
                <div
                  className="w-full bg-blue-500 transition-all duration-700"
                  style={{
                    height: `${Math.max(blogPct, week.blogPosts > 0 ? 3 : 0)}px`,
                  }}
                />
                {/* Prompts portion */}
                <div
                  className={cn(
                    "w-full transition-all duration-700",
                    isHovered ? "bg-emerald-400" : "bg-emerald-600"
                  )}
                  style={{
                    height: `${Math.max(promptPct, week.prompts > 0 ? 3 : 0)}px`,
                    minHeight: week.total > 0 ? "4px" : "0px",
                  }}
                />
              </div>

              <div
                className={cn(
                  "text-[8px] font-black truncate w-full text-center transition-colors",
                  isHovered ? "text-zinc-300" : "text-zinc-700"
                )}
              >
                {week.weekLabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── SEO Checklist ─────────────────────────────────────────────────────────────

const CHECKLIST_ICONS: Record<string, React.ElementType> = {
  site_name: Tag,
  https: ShieldCheck,
  sitemap: Map,
  blog_active: Rss,
  public_library: Library,
  content_volume: Layers,
  gsc_connected: Search,
  mobile_responsive: Smartphone,
};

function SEOChecklist({ checklist }: { checklist: ChecklistItem[] }) {
  return (
    <div className="p-8 rounded-[36px] bg-zinc-950 border border-white/5 flex flex-col gap-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/[0.03] to-transparent pointer-events-none" />

      <div className="relative flex items-center gap-4">
        <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-white tracking-tight">
            SEO Checklist
          </h3>
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">
            בדיקות SEO - מצב נוכחי
          </p>
        </div>
      </div>

      <div className="relative space-y-2">
        {checklist.map((item) => {
          const ItemIcon = CHECKLIST_ICONS[item.id] ?? Globe;
          return (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all",
                item.status
                  ? "bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/20"
                  : "bg-white/[0.02] border-white/5 hover:border-white/10"
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-xl border shrink-0",
                  item.status
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-zinc-900 border-white/5 text-zinc-600"
                )}
              >
                <ItemIcon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">
                    {item.label}
                  </span>
                  <span className="text-[10px] text-zinc-600 font-bold hidden md:block">
                    / {item.labelHe}
                  </span>
                </div>
                {item.detail && (
                  <p
                    className={cn(
                      "text-[10px] font-bold mt-0.5 truncate",
                      item.status ? "text-zinc-500" : "text-amber-600"
                    )}
                  >
                    {item.detail}
                  </p>
                )}
              </div>

              {item.status ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-zinc-700 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Google Search Console Section ─────────────────────────────────────────────

function GSCSection({
  connected,
  siteUrl,
}: {
  connected: boolean;
  siteUrl: string | null;
}) {
  return (
    <div className="p-8 rounded-[36px] bg-zinc-950 border border-white/5 flex flex-col gap-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/[0.04] to-transparent pointer-events-none" />

      <div className="relative flex items-center gap-4">
        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
          <Search className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-white tracking-tight">
            Google Search Console
          </h3>
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">
            ביצועי חיפוש אורגני
          </p>
        </div>

        <div
          className={cn(
            "ms-auto px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
            connected
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-zinc-800 text-zinc-500 border border-white/5"
          )}
        >
          {connected ? "Connected" : "Not Connected"}
        </div>
      </div>

      {connected ? (
        <div className="relative p-8 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center gap-4">
          <Search className="w-10 h-10 text-blue-400/30" />
          <div className="text-center space-y-1">
            <p className="text-sm font-black text-white">
              Search Console data will appear here
            </p>
            <p className="text-xs text-zinc-600">
              Site: <span className="text-zinc-400">{siteUrl}</span>
            </p>
            <p className="text-[10px] text-zinc-700 mt-2">
              Connect the GSC API via OAuth to show impressions, clicks, CTR, and keyword rankings
            </p>
          </div>
          <a
            href={`https://search.google.com/search-console?resource_id=${encodeURIComponent(siteUrl ?? "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs font-black text-blue-400 hover:text-blue-300 transition-colors"
          >
            פתח ב-Google Search Console
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      ) : (
        <div className="relative space-y-4">
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
            <p className="text-xs text-zinc-500 leading-relaxed">
              כדי לחבר את Google Search Console ולצפות בנתוני SEO בזמן אמת,
              הוסף את משתני הסביבה הבאים:
            </p>

            <div className="space-y-2">
              {[
                {
                  key: "GOOGLE_SEARCH_CONSOLE_SITE_URL",
                  example: "https://your-site.com",
                  desc: "כתובת האתר כפי שמופיעה ב-Search Console",
                },
                {
                  key: "GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL",
                  example: "service-account@project.iam.gserviceaccount.com",
                  desc: "Service Account email עם גישה ל-Search Console",
                },
                {
                  key: "GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY",
                  example: "-----BEGIN PRIVATE KEY-----...",
                  desc: "Private key של Service Account",
                },
              ].map((env) => (
                <div
                  key={env.key}
                  className="p-3 rounded-xl bg-zinc-900 border border-white/5 font-mono text-xs space-y-1"
                >
                  <div className="text-blue-300 font-black">{env.key}</div>
                  <div className="text-zinc-600"># {env.desc}</div>
                  <div className="text-zinc-500"># e.g. {env.example}</div>
                </div>
              ))}
            </div>

            <a
              href="https://developers.google.com/webmaster-tools/search-console-api-original/v3/searchanalytics/query"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[10px] font-black text-blue-400 hover:text-blue-300 transition-colors"
            >
              GSC API Documentation
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Quick Actions ─────────────────────────────────────────────────────────────

function QuickActions() {
  return (
    <div className="p-8 rounded-[36px] bg-zinc-950 border border-white/5 flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-white tracking-tight">
            Quick Actions
          </h3>
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">
            פעולות SEO מהירות
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href="/sitemap.xml"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 hover:bg-emerald-500/5 transition-all"
        >
          <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/5 text-emerald-400 group-hover:bg-emerald-500/10 transition-colors">
            <Map className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-black text-white">View Sitemap</div>
            <div className="text-[10px] text-zinc-600 font-bold">/sitemap.xml</div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
        </a>

        <a
          href="/robots.txt"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-blue-500/20 hover:bg-blue-500/5 transition-all"
        >
          <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/5 text-blue-400 group-hover:bg-blue-500/10 transition-colors">
            <FileText className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-black text-white">Check Robots.txt</div>
            <div className="text-[10px] text-zinc-600 font-bold">/robots.txt</div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-blue-400 transition-colors" />
        </a>

        <a
          href="https://search.google.com/test/rich-results"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-purple-500/20 hover:bg-purple-500/5 transition-all"
        >
          <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/5 text-purple-400 group-hover:bg-purple-500/10 transition-colors">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-black text-white">Rich Results Test</div>
            <div className="text-[10px] text-zinc-600 font-bold">Google Rich Snippets</div>
          </div>
          <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-purple-400 transition-colors" />
        </a>

        <a
          href="https://pagespeed.web.dev/"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-amber-500/20 hover:bg-amber-500/5 transition-all"
        >
          <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/5 text-amber-400 group-hover:bg-amber-500/10 transition-colors">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-black text-white">PageSpeed Insights</div>
            <div className="text-[10px] text-zinc-600 font-bold">Core Web Vitals</div>
          </div>
          <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 transition-colors" />
        </a>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function SEOConsolePage() {
  const [data, setData] = useState<SEOData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiPath("/api/admin/seo-console"));
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
      }
      const json: SEOData = await res.json();
      setData(json);
    } catch (err) {
      logger.error("[Admin SEO Console] Failed to load:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !data) return <PageSkeleton />;

  if (error && !data) {
    return (
      <AdminLayout>
        <div
          className="flex flex-col items-center justify-center py-40 gap-6"
          dir="rtl"
        >
          <div className="p-6 rounded-full bg-rose-500/10 border border-rose-500/20">
            <AlertCircle className="w-10 h-10 text-rose-500" />
          </div>
          <div className="text-center space-y-2 max-w-md">
            <p className="text-lg font-black text-white">SEO Console Unavailable</p>
            <p className="text-sm text-zinc-500">{error}</p>
          </div>
          <button
            onClick={loadData}
            className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors px-4 py-2 rounded-xl border border-white/5 hover:border-white/10"
          >
            Retry
          </button>
        </div>
      </AdminLayout>
    );
  }

  if (!data) return null;

  const { contentMetrics } = data;

  return (
    <AdminLayout>
      <div
        className="space-y-10 animate-in fade-in duration-700 select-none pb-24"
        dir="rtl"
      >
        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-zinc-950/50 px-10 py-10 rounded-[40px] border border-white/5">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Globe className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">
                Smart SEO Dashboard
              </span>
            </div>
            <h1 className="text-5xl font-black bg-gradient-to-l from-white to-zinc-600 bg-clip-text text-transparent tracking-tighter leading-none">
              SEO Console
            </h1>
            <p className="text-zinc-500 font-medium tracking-tight text-lg">
              מדדי SEO, ניתוח תוכן וחיבור ל-Google Search Console
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 text-[9px] font-bold text-zinc-700 uppercase tracking-widest hover:text-white transition-colors self-end"
          >
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
            {loading ? "טוען..." : "רענן נתונים"}
          </button>
        </div>

        {/* ── SEO Health Score + Content Metrics ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Score card */}
          <div className="lg:col-span-1 p-8 rounded-[36px] bg-zinc-950 border border-white/5 flex flex-col items-center justify-center gap-6 relative overflow-hidden">
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br to-transparent pointer-events-none opacity-30",
                data.seoHealthScore >= 80
                  ? "from-emerald-600/20"
                  : data.seoHealthScore >= 50
                  ? "from-amber-600/20"
                  : "from-rose-600/20"
              )}
            />
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">
              SEO Health Score
            </div>
            <HealthScoreRing
              score={data.seoHealthScore}
              passed={data.passedChecks}
              total={data.totalChecks}
            />
            {/* Mini score bar */}
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full bg-gradient-to-r transition-all duration-1000",
                  scoreGradient(data.seoHealthScore)
                )}
                style={{ width: `${data.seoHealthScore}%` }}
              />
            </div>
          </div>

          {/* Metric cards grid */}
          <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-6">
            <MetricCard
              label="Total Public Pages"
              value={contentMetrics.totalPublicPages.toLocaleString()}
              sub={`${contentMetrics.publicPrompts} prompts`}
              icon={FileText}
              color="blue"
            />
            <MetricCard
              label="Blog Posts"
              value={contentMetrics.blogPosts.toLocaleString()}
              sub={`${contentMetrics.blogCategories} categories`}
              icon={BookOpen}
              color="purple"
            />
            <MetricCard
              label="Avg Weekly Content"
              value={contentMetrics.avgWeeklyContent.toString()}
              sub="pages per week"
              icon={TrendingUp}
              color="emerald"
            />
            <MetricCard
              label="Registered Users"
              value={contentMetrics.totalUsers.toLocaleString()}
              sub={`${contentMetrics.knownRoutes} known routes`}
              icon={Globe}
              color="amber"
            />
          </div>
        </div>

        {/* ── Content Calendar ── */}
        <ContentCalendar weeklyData={data.weeklyData} />

        {/* ── SEO Checklist + GSC side by side on large screens ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SEOChecklist checklist={data.checklist} />
          <div className="flex flex-col gap-6">
            <GSCSection
              connected={data.gscConnected}
              siteUrl={data.gscSiteUrl}
            />
            <QuickActions />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="text-center text-[9px] font-bold text-zinc-700 uppercase tracking-widest">
          Data generated at{" "}
          {new Date(data.generatedAt).toLocaleString("he-IL")}
        </div>
      </div>
    </AdminLayout>
  );
}
