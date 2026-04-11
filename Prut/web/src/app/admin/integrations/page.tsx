"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { getApiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";
import {
  Video,
  BarChart3,
  Search,
  Zap,
  TrendingUp,
  FlaskConical,
  AlertTriangle,
  Clock,
  Shield,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Send,
  Loader2,
  Plug,
  ArrowUpRight,
  Copy,
  ChevronDown,
  ChevronUp,
  Globe,
  Activity,
  Users,
  FileText,
  RefreshCw,
  Database,
  Mail,
  ArrowUpFromLine,
  ArrowDownFromLine,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type ServiceStatus = "active" | "needs-setup" | "not-configured" | "error" | "loading";

interface IndexNowResult {
  success: boolean;
  urlsSubmitted?: number;
  error?: string;
}

interface LiveData {
  ga4?: {
    status: string;
    activeUsers?: number;
    sessions?: number;
    pageViews?: number;
    bounceRate?: number;
    avgSessionDuration?: number;
    deltas?: { activeUsers?: number; sessions?: number; pageViews?: number };
    period?: string;
    error?: string;
  };
  app?: {
    status: string;
    totalUsers?: number;
    newUsersWeek?: number;
    proUsers?: number;
    promptsWeek?: number;
    promptsMonth?: number;
    activityWeek?: number;
    errorRate?: number;
  };
  sentry?: { status: string; hasDSN?: boolean; hasAuthToken?: boolean };
  redis?: { status: string; latencyMs?: number };
  resend?: { status: string; fromEmail?: string };
  services?: {
    clarity?: { configured: boolean; id?: string | null };
    indexnow?: { configured: boolean; keyPrefix?: string | null };
    posthog?: { configured: boolean };
    searchConsole?: { configured: boolean; siteUrl?: string | null };
    lemonSqueezy?: { configured: boolean; storeId?: string | null };
  };
  fetchedAt?: string;
}

// ── Metric Mini Card ────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  delta,
  suffix,
}: {
  label: string;
  value: number | string;
  delta?: number;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2 rounded-xl bg-white/2 border border-white/5">
      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-black text-white tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {suffix && <span className="text-[10px] text-zinc-500 font-bold">{suffix}</span>}
        {delta !== undefined && delta !== 0 && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-[10px] font-black",
              delta > 0 ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {delta > 0 ? (
              <ArrowUpFromLine className="w-3 h-3" />
            ) : (
              <ArrowDownFromLine className="w-3 h-3" />
            )}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ── Status Badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ServiceStatus }) {
  if (status === "loading") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-zinc-800 border border-white/5 text-zinc-500">
        <Loader2 className="w-3 h-3 animate-spin" />
        טוען
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        פעיל
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-500/10 border border-rose-500/20 text-rose-400">
        <AlertCircle className="w-3 h-3" />
        שגיאה
      </span>
    );
  }
  if (status === "needs-setup") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 text-amber-400">
        <AlertCircle className="w-3 h-3" />
        דורש הגדרה
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-zinc-800 border border-white/5 text-zinc-500">
      <XCircle className="w-3 h-3" />
      לא מוגדר
    </span>
  );
}

// ── Feature Tag ────────────────────────────────────────────────────────────

function FeatureTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-white/4 border border-white/6 text-zinc-500">
      {label}
    </span>
  );
}

// ── Action Button ──────────────────────────────────────────────────────────

interface ActionButtonProps {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
}

function ActionButton({
  href,
  onClick,
  children,
  variant = "secondary",
  icon,
  disabled,
  loading,
}: ActionButtonProps) {
  const baseClass = cn(
    "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 cursor-pointer",
    variant === "primary"
      ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
      : "bg-white/4 hover:bg-white/8 border border-white/8 text-zinc-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
  );

  const content = (
    <>
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : icon}
      {children}
    </>
  );

  if (href && href.startsWith("/")) {
    return (
      <a href={href} className={baseClass}>
        {content}
      </a>
    );
  }

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={baseClass}>
        {content}
        <ArrowUpRight className="w-3 h-3 opacity-40" />
      </a>
    );
  }

  return (
    <button onClick={onClick} disabled={disabled || loading} className={baseClass}>
      {content}
    </button>
  );
}

// ── Setup Components ───────────────────────────────────────────────────────

function SetupStep({ step, text }: { step: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 w-5 h-5 rounded-full bg-zinc-800 border border-white/10 text-zinc-500 text-[9px] font-black flex items-center justify-center shrink-0">
        {step}
      </span>
      <p className="text-xs text-zinc-500 leading-relaxed">{text}</p>
    </div>
  );
}

function EnvVarBadge({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(name).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[10px] bg-zinc-900 border border-white/[0.07] text-zinc-400 hover:text-white hover:border-white/20 transition-colors cursor-pointer"
      title="Copy to clipboard"
    >
      {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-50" />}
      {name}
    </button>
  );
}

function SetupPanel({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        הוראות הגדרה
      </button>
      {open && (
        <div className="mt-4 space-y-3 pl-2 border-s border-white/5">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Integration Card ───────────────────────────────────────────────────────

interface IntegrationCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: ServiceStatus;
  features: string[];
  actions: React.ReactNode;
  setup?: React.ReactNode;
  accent?: "blue" | "amber" | "purple" | "emerald" | "rose" | "cyan" | "orange";
  metrics?: React.ReactNode;
  extra?: React.ReactNode;
}

const ACCENT_COLORS = {
  blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", hover: "hover:border-blue-500/20" },
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", hover: "hover:border-amber-500/20" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400", hover: "hover:border-purple-500/20" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", hover: "hover:border-emerald-500/20" },
  rose: { bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-400", hover: "hover:border-rose-500/20" },
  cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-400", hover: "hover:border-cyan-500/20" },
  orange: { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400", hover: "hover:border-orange-500/20" },
};

function IntegrationCard({
  icon, title, description, status, features, actions, setup, accent = "blue", metrics, extra,
}: IntegrationCardProps) {
  const a = ACCENT_COLORS[accent];

  return (
    <div className={cn(
      "p-6 rounded-3xl bg-zinc-950 border border-white/5 flex flex-col gap-4 transition-all duration-300",
      a.hover, "hover:shadow-xl"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn("p-3 rounded-2xl border", a.bg, a.border, a.text)}>
            {icon}
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-tight">{title}</h3>
            <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed max-w-xs">{description}</p>
          </div>
        </div>
        <div className="shrink-0 pt-0.5">
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Live Metrics */}
      {metrics}

      {/* Feature tags */}
      <div className="flex flex-wrap gap-1.5">
        {features.map((f) => <FeatureTag key={f} label={f} />)}
      </div>

      {/* Extra content */}
      {extra}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-white/4">
        {actions}
      </div>

      {/* Setup */}
      {setup && <div className="border-t border-white/4 pt-3">{setup}</div>}
    </div>
  );
}

// ── IndexNow Submit Button ─────────────────────────────────────────────────

function IndexNowSubmitButton() {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<IndexNowResult | null>(null);

  async function handleSubmit() {
    setState("loading");
    setResult(null);
    try {
      const res = await fetch(getApiPath("/api/indexnow"), { method: "POST" });
      const data: IndexNowResult = await res.json();
      if (res.ok && data.success) {
        setResult(data);
        setState("success");
      } else {
        setResult({ success: false, error: data.error ?? `HTTP ${res.status}` });
        setState("error");
      }
    } catch (err) {
      setResult({ success: false, error: err instanceof Error ? err.message : "Network error" });
      setState("error");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <ActionButton variant="primary" icon={<Send className="w-3 h-3" />} onClick={handleSubmit} loading={state === "loading"} disabled={state === "loading"}>
        שלח URLs עכשיו
      </ActionButton>
      {state === "success" && result && (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {result.urlsSubmitted} URLs נשלחו
        </span>
      )}
      {state === "error" && result && (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400">
          <AlertCircle className="w-3.5 h-3.5" />
          {result.error}
        </span>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiPath("/api/admin/integrations"));
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastRefresh(new Date());
      }
    } catch {
      // silently fail - cards show individual status
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derive statuses from live data
  const ga4Status: ServiceStatus = !data ? "loading" : data.ga4?.status === "active" ? "active" : data.ga4?.status === "error" ? "error" : "needs-setup";
  const clarityStatus: ServiceStatus = !data ? "loading" : data.services?.clarity?.configured ? "active" : "needs-setup";
  const indexnowStatus: ServiceStatus = !data ? "loading" : data.services?.indexnow?.configured ? "active" : "needs-setup";
  const sentryStatus: ServiceStatus = !data ? "loading" : data.sentry?.status === "active" ? "active" : "needs-setup";
  const redisStatus: ServiceStatus = !data ? "loading" : data.redis?.status === "active" ? "active" : data.redis?.status === "error" ? "error" : "needs-setup";
  const posthogStatus: ServiceStatus = !data ? "loading" : data.services?.posthog?.configured ? "active" : "needs-setup";
  const gscStatus: ServiceStatus = !data ? "loading" : data.services?.searchConsole?.configured ? "active" : "needs-setup";

  const activeCount = [ga4Status, clarityStatus, indexnowStatus, sentryStatus, redisStatus, posthogStatus, gscStatus, "active" /* vercel */, "active" /* resend */].filter(s => s === "active").length;
  const setupCount = [ga4Status, clarityStatus, indexnowStatus, sentryStatus, redisStatus, posthogStatus, gscStatus].filter(s => s === "needs-setup").length;

  const posthogHost = typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.posthog.com"
    : "https://us.posthog.com";

  return (
    <AdminLayout>
      <div className="space-y-8 animate-in fade-in duration-700 select-none pb-24" dir="rtl">

        {/* ── Page Header ── */}
        <div className="bg-zinc-950/50 px-6 md:px-10 py-8 md:py-10 rounded-3xl border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Plug className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-500">
                Third-party Services
              </span>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
              {lastRefresh ? `עודכן ${lastRefresh.toLocaleTimeString("he-IL")}` : "טוען..."}
            </button>
          </div>
          <h1 className="text-4xl md:text-5xl font-black bg-linear-to-l from-white to-zinc-600 bg-clip-text text-transparent tracking-tighter leading-none">
            Integrations Hub
          </h1>
          <p className="text-zinc-500 font-medium tracking-tight text-sm md:text-base">
            סטטוס וגישה מהירה לכל השירותים המחוברים לפרויקט Peroot - נתונים בזמן אמת
          </p>

          {/* Quick status summary */}
          <div className="flex flex-wrap gap-3 pt-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{activeCount} שירותים פעילים</span>
            </div>
            {setupCount > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{setupCount} דורשים הגדרה</span>
              </div>
            )}
          </div>

          {/* Live App Stats Banner */}
          {data?.app?.status === "active" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-white/5">
              <MetricCard label="סה״כ משתמשים" value={data.app.totalUsers || 0} />
              <MetricCard label="חדשים השבוע" value={data.app.newUsersWeek || 0} />
              <MetricCard label="Pro" value={data.app.proUsers || 0} />
              <MetricCard label="פרומפטים החודש" value={data.app.promptsMonth || 0} />
            </div>
          )}
        </div>

        {/* ── Analytics & Monitoring ── */}
        <div className="px-1">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">Analytics & User Intelligence</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          {/* 1. Google Analytics 4 */}
          <IntegrationCard
            icon={<Globe className="w-5 h-5" />}
            title="Google Analytics 4"
            description="ניתוח מבקרים, מקורות תעבורה ומעקב אירועים - נתוני 7 ימים אחרונים."
            status={ga4Status}
            accent="orange"
            features={["Real-time Users", "Audience Insights", "Traffic Sources", "Event Tracking"]}
            metrics={
              data?.ga4?.status === "active" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <MetricCard label="משתמשים פעילים" value={data.ga4.activeUsers || 0} delta={data.ga4.deltas?.activeUsers} />
                  <MetricCard label="סשנים" value={data.ga4.sessions || 0} delta={data.ga4.deltas?.sessions} />
                  <MetricCard label="צפיות" value={data.ga4.pageViews || 0} delta={data.ga4.deltas?.pageViews} />
                  <MetricCard label="Bounce Rate" value={`${data.ga4.bounceRate || 0}%`} />
                  <MetricCard label="משך ממוצע" value={data.ga4.avgSessionDuration || 0} suffix="שניות" />
                </div>
              )
            }
            actions={
              <>
                <ActionButton href="https://analytics.google.com/analytics/web/#/p528142013" variant="primary" icon={<BarChart3 className="w-3 h-3" />}>
                  GA4 Dashboard
                </ActionButton>
                <ActionButton href="/admin/google-analytics" icon={<Activity className="w-3 h-3" />}>
                  Admin GA Page
                </ActionButton>
              </>
            }
          />

          {/* 2. Microsoft Clarity */}
          <IntegrationCard
            icon={<Video className="w-5 h-5" />}
            title="Microsoft Clarity"
            description="הקלטת סשנים, מפות חום וניתוח התנהגות משתמשים בזמן אמת."
            status={clarityStatus}
            accent="blue"
            features={["Session Recordings", "Heatmaps", "Rage Clicks", "Dead Clicks", "Smart Insights"]}
            actions={
              <>
                <ActionButton href="https://clarity.microsoft.com/" variant="primary" icon={<BarChart3 className="w-3 h-3" />}>
                  פתח Clarity Dashboard
                </ActionButton>
                <ActionButton href="https://clarity.microsoft.com/" icon={<ExternalLink className="w-3 h-3" />}>
                  Get API Key
                </ActionButton>
              </>
            }
            extra={
              clarityStatus === "needs-setup" ? (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold leading-relaxed">
                    הגדר <EnvVarBadge name="NEXT_PUBLIC_CLARITY_ID" /> ב-Vercel Environment Variables
                  </p>
                </div>
              ) : data?.services?.clarity?.id ? (
                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-600">
                  Project ID: <span className="font-mono text-zinc-400">{data.services.clarity.id}</span>
                </div>
              ) : null
            }
            setup={
              <SetupPanel>
                <SetupStep step={1} text="היכנס ל-clarity.microsoft.com עם חשבון Microsoft" />
                <SetupStep step={2} text="לחץ על 'New project' והגדר את הדומיין www.peroot.space" />
                <SetupStep step={3} text="העתק את ה-Project ID מהגדרות הפרויקט" />
                <SetupStep step={4} text="הוסף את ה-ID כ-NEXT_PUBLIC_CLARITY_ID ב-Vercel → Settings → Environment Variables" />
                <SetupStep step={5} text="בצע redeploy על מנת שהשינוי ייכנס לתוקף" />
              </SetupPanel>
            }
          />

          {/* 3. Vercel Analytics & Speed Insights */}
          <IntegrationCard
            icon={<TrendingUp className="w-5 h-5" />}
            title="Vercel Analytics & Speed Insights"
            description="ניתוח תעבורה ומדדי ביצועים מובנה - נתונים נצפים ב-Vercel Dashboard."
            status="active"
            accent="purple"
            features={["Visitors", "Page Views", "Bounce Rate", "LCP", "FID", "CLS"]}
            actions={
              <>
                <ActionButton href="https://vercel.com/sassongal/web/analytics" variant="primary" icon={<BarChart3 className="w-3 h-3" />}>
                  Vercel Analytics
                </ActionButton>
                <ActionButton href="https://vercel.com/sassongal/web/speed-insights" icon={<Zap className="w-3 h-3" />}>
                  Speed Insights
                </ActionButton>
              </>
            }
          />

          {/* 4. Google Search Console */}
          <IntegrationCard
            icon={<Search className="w-5 h-5" />}
            title="Google Search Console"
            description="ניתוח ביצועי חיפוש אורגני, כיסוי אינדקס ומצב Sitemap."
            status={gscStatus}
            accent="emerald"
            features={["Search Queries", "Click-through Rates", "Index Coverage", "Core Web Vitals", "Sitemap"]}
            actions={
              <>
                <ActionButton href="https://search.google.com/search-console?resource_id=https://www.peroot.space" variant="primary" icon={<Search className="w-3 h-3" />}>
                  Search Console
                </ActionButton>
                <ActionButton href="/admin/seo-console" icon={<Activity className="w-3 h-3" />}>
                  Admin SEO
                </ActionButton>
              </>
            }
            extra={
              gscStatus === "active" && data?.services?.searchConsole?.siteUrl ? (
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  מחובר: {data.services.searchConsole.siteUrl}
                </div>
              ) : gscStatus === "needs-setup" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-600">Env vars נדרשים:</span>
                  <EnvVarBadge name="GOOGLE_SEARCH_CONSOLE_SITE_URL" />
                  <EnvVarBadge name="NEXT_PUBLIC_GOOGLE_VERIFICATION" />
                </div>
              ) : null
            }
            setup={
              <SetupPanel>
                <SetupStep step={1} text="הוסף את www.peroot.space ב-Search Console ובחר 'URL prefix'" />
                <SetupStep step={2} text="העתק את קוד האימות מ-HTML tag" />
                <SetupStep step={3} text="הוסף NEXT_PUBLIC_GOOGLE_VERIFICATION ב-Vercel env vars" />
                <SetupStep step={4} text="הוסף GOOGLE_SEARCH_CONSOLE_SITE_URL=https://www.peroot.space" />
                <SetupStep step={5} text="שלח Sitemap: https://www.peroot.space/sitemap.xml" />
              </SetupPanel>
            }
          />

          {/* 5. IndexNow */}
          <IntegrationCard
            icon={<Zap className="w-5 h-5" />}
            title="IndexNow"
            description="שליחה מיידית של URLs ל-Bing ו-Yandex לאינדוקס מהיר."
            status={indexnowStatus}
            accent="amber"
            features={["Instant Bing Indexing", "Yandex Indexing", "Batch Submission"]}
            extra={
              indexnowStatus === "active" && data?.services?.indexnow?.keyPrefix ? (
                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-600">
                  Key: <span className="font-mono text-amber-400">{data.services.indexnow.keyPrefix}</span>
                </div>
              ) : null
            }
            actions={
              <>
                <IndexNowSubmitButton />
                <ActionButton href="https://www.bing.com/indexnow" icon={<ExternalLink className="w-3 h-3" />}>
                  Register Key
                </ActionButton>
              </>
            }
            setup={
              <SetupPanel>
                <SetupStep step={1} text="היכנס ל-bing.com/indexnow וצור מפתח API חינמי" />
                <SetupStep step={2} text="הוסף INDEXNOW_KEY ב-Vercel env vars" />
                <SetupStep step={3} text="לחץ על 'שלח URLs עכשיו' לשליחת כל הדפים" />
              </SetupPanel>
            }
          />

          {/* 6. PostHog */}
          <IntegrationCard
            icon={<FlaskConical className="w-5 h-5" />}
            title="PostHog"
            description="אנליטיקות מוצר, feature flags, הקלטת סשנים ופאנלים."
            status={posthogStatus}
            accent="purple"
            features={["Event Tracking", "Feature Flags", "Session Recording", "Funnels", "Cohorts"]}
            actions={
              <>
                <ActionButton href={posthogHost} variant="primary" icon={<ExternalLink className="w-3 h-3" />}>
                  פתח PostHog
                </ActionButton>
                <ActionButton href="/admin/experiments" icon={<FlaskConical className="w-3 h-3" />}>
                  Experiments
                </ActionButton>
              </>
            }
            extra={
              posthogStatus === "needs-setup" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-600">חסר:</span>
                  <EnvVarBadge name="NEXT_PUBLIC_POSTHOG_KEY" />
                  <EnvVarBadge name="NEXT_PUBLIC_POSTHOG_HOST" />
                </div>
              ) : null
            }
          />

        </div>

        {/* ── Monitoring & Infrastructure ── */}
        <div className="px-1 pt-2">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">Monitoring & Infrastructure</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          {/* 7. Sentry */}
          <IntegrationCard
            icon={<AlertTriangle className="w-5 h-5" />}
            title="Sentry"
            description="מעקב שגיאות וביצועים בזמן אמת."
            status={sentryStatus}
            accent="rose"
            features={["Error Tracking", "Performance", "Release Tracking", "Source Maps"]}
            metrics={
              data?.app?.status === "active" ? (
                <div className="grid grid-cols-2 gap-2">
                  <MetricCard label="שיעור שגיאות" value={`${data.app.errorRate || 0}%`} />
                  <MetricCard label="פעילות שבועית" value={data.app.activityWeek || 0} />
                </div>
              ) : null
            }
            actions={
              <ActionButton href="https://sentry.io/" variant="primary" icon={<AlertTriangle className="w-3 h-3" />}>
                Sentry Dashboard
              </ActionButton>
            }
          />

          {/* 8. Upstash Redis */}
          <IntegrationCard
            icon={<Database className="w-5 h-5" />}
            title="Upstash Redis"
            description="Rate limiting ומנגנון cache עם זמן תגובה נמוך."
            status={redisStatus}
            accent="cyan"
            features={["Rate Limiting", "Caching", "Maintenance Mode", "Session Storage"]}
            metrics={
              data?.redis?.status === "active" ? (
                <div className="grid grid-cols-1 gap-2">
                  <MetricCard label="Ping Latency" value={data.redis.latencyMs || 0} suffix="ms" />
                </div>
              ) : null
            }
            actions={
              <ActionButton href="https://console.upstash.com/" variant="primary" icon={<Database className="w-3 h-3" />}>
                Upstash Console
              </ActionButton>
            }
          />

          {/* 9. Resend (Email) */}
          <IntegrationCard
            icon={<Mail className="w-5 h-5" />}
            title="Resend"
            description="שליחת מיילים - קמפיינים, אימות והתראות."
            status={data?.resend?.status === "active" ? "active" : !data ? "loading" : "needs-setup"}
            accent="blue"
            features={["Email Campaigns", "Transactional", "Templates"]}
            extra={
              data?.resend?.fromEmail && data.resend.fromEmail !== "not set" ? (
                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-600">
                  From: <span className="font-mono text-blue-400">{data.resend.fromEmail}</span>
                </div>
              ) : null
            }
            actions={
              <>
                <ActionButton href="https://resend.com/emails" variant="primary" icon={<Mail className="w-3 h-3" />}>
                  Resend Dashboard
                </ActionButton>
                <ActionButton href="/admin/email-campaigns" icon={<Mail className="w-3 h-3" />}>
                  קמפיינים
                </ActionButton>
              </>
            }
          />

          {/* 10. Better Stack */}
          <IntegrationCard
            icon={<Clock className="w-5 h-5" />}
            title="Better Stack"
            description="ניטור זמינות עם התראות SMS/מייל ודף סטטוס ציבורי."
            status="not-configured"
            accent="cyan"
            features={["Uptime Monitoring", "SMS / Email Alerts", "Status Page"]}
            actions={
              <ActionButton href="https://betterstack.com/better-uptime" variant="primary" icon={<ExternalLink className="w-3 h-3" />}>
                Sign Up Free
              </ActionButton>
            }
            setup={
              <SetupPanel>
                <SetupStep step={1} text="הירשם חינם ב-betterstack.com/better-uptime" />
                <SetupStep step={2} text="הוסף monitors ל-www.peroot.space, /api/health, /api/enhance" />
                <SetupStep step={3} text="הגדר התראות מייל/SMS" />
              </SetupPanel>
            }
          />

        </div>

        {/* ── Security ── */}
        <div className="px-1 pt-2">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">Security</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* HSTS Preload */}
          <IntegrationCard
            icon={<Shield className="w-5 h-5" />}
            title="HSTS Preload"
            description="כותרת HSTS מוגדרת - צריך לתקן www subdomain."
            status="needs-setup"
            accent="emerald"
            features={["HTTPS Enforcement", "Browser Preload List", "MITM Protection"]}
            actions={
              <>
                <ActionButton href="https://hstspreload.org/?domain=www.peroot.space" variant="primary" icon={<CheckCircle2 className="w-3 h-3" />}>
                  בדוק סטטוס
                </ActionButton>
                <ActionButton href="https://vercel.com/sassongal/web/settings/domains" icon={<Globe className="w-3 h-3" />}>
                  הוסף www ב-Vercel
                </ActionButton>
              </>
            }
            setup={
              <SetupPanel>
                <SetupStep step={1} text="היכנס ל-Vercel → Settings → Domains" />
                <SetupStep step={2} text="הוסף www.peroot.space כ-redirect domain" />
                <SetupStep step={3} text="ודא HTTPS עובד על www.peroot.space" />
                <SetupStep step={4} text="שלח ב-hstspreload.org" />
              </SetupPanel>
            }
          />

          {/* LemonSqueezy */}
          <IntegrationCard
            icon={<Users className="w-5 h-5" />}
            title="LemonSqueezy"
            description="תשלומים ומנויים - Pro plan management."
            status={!data ? "loading" : data.services?.lemonSqueezy?.configured ? "active" : "needs-setup"}
            accent="amber"
            features={["Subscriptions", "Webhooks", "Customer Portal"]}
            extra={
              data?.services?.lemonSqueezy?.storeId ? (
                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-600">
                  Store: <span className="font-mono text-amber-400">{data.services.lemonSqueezy.storeId}</span>
                </div>
              ) : null
            }
            actions={
              <>
                <ActionButton href="https://app.lemonsqueezy.com/dashboard" variant="primary" icon={<TrendingUp className="w-3 h-3" />}>
                  LemonSqueezy Dashboard
                </ActionButton>
                <ActionButton href="/admin/revenue" icon={<FileText className="w-3 h-3" />}>
                  הכנסות
                </ActionButton>
              </>
            }
          />
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between text-[9px] font-bold text-zinc-700 uppercase tracking-widest px-2 pt-4">
          <span>Peroot Integrations Hub</span>
          <span className="flex items-center gap-1">
            <Plug className="w-3 h-3" />
            {activeCount + 1 /* +1 for Better Stack when configured */} שירותים מנוטרים
          </span>
        </div>

      </div>
    </AdminLayout>
  );
}
