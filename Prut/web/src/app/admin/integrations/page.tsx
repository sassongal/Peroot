"use client";

import { useState } from "react";
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
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type ServiceStatus = "active" | "needs-setup" | "not-configured";

interface IndexNowResult {
  success: boolean;
  urlsSubmitted?: number;
  error?: string;
}

// ── Status Badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ServiceStatus }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        פעיל
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

// ── Feature Tag ────────────────────────────────────────────────────────────────

function FeatureTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-white/[0.04] border border-white/[0.06] text-zinc-500">
      {label}
    </span>
  );
}

// ── Action Button ──────────────────────────────────────────────────────────────

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
    "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 shrink-0",
    variant === "primary"
      ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
      : "bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
  );

  const content = (
    <>
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : icon}
      {children}
    </>
  );

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

// ── Setup Instruction ──────────────────────────────────────────────────────────

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

// ── Env Var Badge ──────────────────────────────────────────────────────────────

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
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[10px] bg-zinc-900 border border-white/[0.07] text-zinc-400 hover:text-white hover:border-white/20 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-50" />}
      {name}
    </button>
  );
}

// ── Collapsible Setup Panel ────────────────────────────────────────────────────

function SetupPanel({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors"
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

// ── Integration Card ───────────────────────────────────────────────────────────

interface IntegrationCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: ServiceStatus;
  features: string[];
  actions: React.ReactNode;
  setup?: React.ReactNode;
  accent?: "blue" | "amber" | "purple" | "emerald" | "rose" | "cyan" | "orange";
  extra?: React.ReactNode;
}

const ACCENT_COLORS = {
  blue:    { bg: "bg-blue-500/10",    border: "border-blue-500/20",    text: "text-blue-400",    hover: "hover:border-blue-500/20"   },
  amber:   { bg: "bg-amber-500/10",   border: "border-amber-500/20",   text: "text-amber-400",   hover: "hover:border-amber-500/20"  },
  purple:  { bg: "bg-purple-500/10",  border: "border-purple-500/20",  text: "text-purple-400",  hover: "hover:border-purple-500/20" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", hover: "hover:border-emerald-500/20"},
  rose:    { bg: "bg-rose-500/10",    border: "border-rose-500/20",    text: "text-rose-400",    hover: "hover:border-rose-500/20"   },
  cyan:    { bg: "bg-cyan-500/10",    border: "border-cyan-500/20",    text: "text-cyan-400",    hover: "hover:border-cyan-500/20"   },
  orange:  { bg: "bg-orange-500/10",  border: "border-orange-500/20",  text: "text-orange-400",  hover: "hover:border-orange-500/20" },
};

function IntegrationCard({
  icon,
  title,
  description,
  status,
  features,
  actions,
  setup,
  accent = "blue",
  extra,
}: IntegrationCardProps) {
  const a = ACCENT_COLORS[accent];

  return (
    <div className={cn(
      "p-6 rounded-3xl bg-zinc-950 border border-white/5 flex flex-col gap-5 transition-all duration-300",
      a.hover,
      "hover:shadow-xl"
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

      {/* Feature tags */}
      <div className="flex flex-wrap gap-1.5">
        {features.map((f) => (
          <FeatureTag key={f} label={f} />
        ))}
      </div>

      {/* Extra content (e.g. IndexNow result) */}
      {extra}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-white/[0.04]">
        {actions}
      </div>

      {/* Collapsible setup instructions */}
      {setup && <div className="border-t border-white/[0.04] pt-3">{setup}</div>}
    </div>
  );
}

// ── IndexNow Submit Button ─────────────────────────────────────────────────────

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
      <ActionButton
        variant="primary"
        icon={<Send className="w-3 h-3" />}
        onClick={handleSubmit}
        loading={state === "loading"}
        disabled={state === "loading"}
      >
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

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  // Detect Clarity — it's injected client-side via NEXT_PUBLIC_CLARITY_ID
  const clarityId =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_CLARITY_ID
      : undefined;

  const clarityStatus: ServiceStatus = clarityId ? "active" : "needs-setup";

  // PostHog dashboard URL
  const posthogHost =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.posthog.com"
      : "https://us.posthog.com";

  return (
    <AdminLayout>
      <div className="space-y-8 animate-in fade-in duration-700 select-none pb-24" dir="rtl">

        {/* ── Page Header ── */}
        <div className="bg-zinc-950/50 px-6 md:px-10 py-8 md:py-10 rounded-3xl border border-white/5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Plug className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-500">
              Third-party Services
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-l from-white to-zinc-600 bg-clip-text text-transparent tracking-tighter leading-none">
            Integrations Hub
          </h1>
          <p className="text-zinc-500 font-medium tracking-tight text-sm md:text-base">
            סטטוס וגישה מהירה לכל השירותים המחוברים לפרויקט Peroot
          </p>

          {/* Quick status summary */}
          <div className="flex flex-wrap gap-3 pt-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>7 שירותים פעילים</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>2 דורשים הגדרה</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500">
              <XCircle className="w-3.5 h-3.5" />
              <span>1 לא מוגדר</span>
            </div>
          </div>
        </div>

        {/* ── Analytics & Monitoring Group Header ── */}
        <div className="px-1">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">Analytics & User Intelligence</p>
        </div>

        {/* ── Grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          {/* 1. Microsoft Clarity */}
          <IntegrationCard
            icon={<Video className="w-5 h-5" />}
            title="Microsoft Clarity"
            description="הקלטת סשנים, מפות חום וניתוח התנהגות משתמשים בזמן אמת."
            status={clarityStatus}
            accent="blue"
            features={["Session Recordings", "Heatmaps", "Rage Clicks", "Dead Clicks", "Smart Insights"]}
            actions={
              <>
                <ActionButton
                  href="https://clarity.microsoft.com/"
                  variant="primary"
                  icon={<BarChart3 className="w-3 h-3" />}
                >
                  פתח Clarity Dashboard
                </ActionButton>
                <ActionButton href="https://clarity.microsoft.com/" icon={<ExternalLink className="w-3 h-3" />}>
                  Get API Key
                </ActionButton>
              </>
            }
            extra={
              !clarityId && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold leading-relaxed">
                    הגדר <EnvVarBadge name="NEXT_PUBLIC_CLARITY_ID" /> ב-Vercel Environment Variables
                  </p>
                </div>
              )
            }
            setup={
              <SetupPanel>
                <SetupStep step={1} text="היכנס ל-clarity.microsoft.com עם חשבון Microsoft" />
                <SetupStep step={2} text="לחץ על 'New project' והגדר את הדומיין peroot.space" />
                <SetupStep step={3} text="העתק את ה-Project ID מהגדרות הפרויקט" />
                <SetupStep step={4} text="הוסף את ה-ID כ-NEXT_PUBLIC_CLARITY_ID ב-Vercel → Settings → Environment Variables" />
                <SetupStep step={5} text="בצע redeploy על מנת שהשינוי ייכנס לתוקף" />
              </SetupPanel>
            }
          />

          {/* 2. Vercel Analytics & Speed Insights */}
          <IntegrationCard
            icon={<TrendingUp className="w-5 h-5" />}
            title="Vercel Analytics & Speed Insights"
            description="ניתוח תעבורה ומדדי ביצועים מובנה בתשתית Vercel — ללא הגדרה נוספת."
            status="active"
            accent="purple"
            features={["Visitors", "Page Views", "Bounce Rate", "LCP", "FID", "CLS"]}
            actions={
              <>
                <ActionButton
                  href="https://vercel.com/sassongal/web/analytics"
                  variant="primary"
                  icon={<BarChart3 className="w-3 h-3" />}
                >
                  Vercel Analytics
                </ActionButton>
                <ActionButton
                  href="https://vercel.com/sassongal/web/speed-insights"
                  icon={<Zap className="w-3 h-3" />}
                >
                  Speed Insights
                </ActionButton>
              </>
            }
          />

          {/* 3. Google Search Console */}
          <IntegrationCard
            icon={<Search className="w-5 h-5" />}
            title="Google Search Console"
            description="ניתוח ביצועי חיפוש אורגני, כיסוי אינדקס ומצב Sitemap."
            status="needs-setup"
            accent="emerald"
            features={["Search Queries", "Click-through Rates", "Index Coverage", "Core Web Vitals", "Sitemap"]}
            actions={
              <>
                <ActionButton
                  href="https://search.google.com/search-console?resource_id=https://peroot.space"
                  variant="primary"
                  icon={<Search className="w-3 h-3" />}
                >
                  Search Console
                </ActionButton>
                <ActionButton
                  href="https://search.google.com/search-console/welcome"
                  icon={<CheckCircle2 className="w-3 h-3" />}
                >
                  Verify Ownership
                </ActionButton>
              </>
            }
            extra={
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-600">Env vars נדרשים:</span>
                <EnvVarBadge name="GOOGLE_SEARCH_CONSOLE_SITE_URL" />
                <EnvVarBadge name="NEXT_PUBLIC_GOOGLE_VERIFICATION" />
              </div>
            }
            setup={
              <SetupPanel>
                <SetupStep step={1} text="הוסף את peroot.space ב-Search Console ובחר 'URL prefix'" />
                <SetupStep step={2} text="העתק את קוד האימות מ-HTML tag ← Other verification methods" />
                <SetupStep step={3} text="הוסף NEXT_PUBLIC_GOOGLE_VERIFICATION ב-Vercel env vars" />
                <SetupStep step={4} text="הוסף GOOGLE_SEARCH_CONSOLE_SITE_URL=https://peroot.space ב-Vercel" />
                <SetupStep step={5} text="שלח את ה-Sitemap: https://peroot.space/sitemap.xml" />
              </SetupPanel>
            }
          />

          {/* 4. IndexNow */}
          <IntegrationCard
            icon={<Zap className="w-5 h-5" />}
            title="IndexNow"
            description="שליחה מיידית של URLs ל-Bing ו-Yandex לאינדוקס מהיר אחרי פרסום תוכן חדש."
            status={
              typeof process !== "undefined" && process.env.INDEXNOW_KEY
                ? "active"
                : "needs-setup"
            }
            accent="amber"
            features={["Instant Bing Indexing", "Yandex Indexing", "Auto-submit on Publish", "Batch Submission"]}
            actions={
              <>
                <IndexNowSubmitButton />
                <ActionButton
                  href="https://www.bing.com/indexnow"
                  icon={<ExternalLink className="w-3 h-3" />}
                >
                  Register Key
                </ActionButton>
              </>
            }
            setup={
              <SetupPanel>
                <SetupStep step={1} text="היכנס ל-bing.com/indexnow וצור מפתח API חינמי" />
                <SetupStep step={2} text="הוסף INDEXNOW_KEY ב-Vercel env vars (server-side בלבד)" />
                <SetupStep step={3} text="צור קובץ {key}.txt בשורש הדומיין עם תוכן המפתח" />
                <SetupStep step={4} text="לחץ על 'שלח URLs עכשיו' לשליחת כל הדפים הפורסמים" />
              </SetupPanel>
            }
          />

        </div>

        {/* ── Product Analytics Group Header ── */}
        <div className="px-1 pt-2">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">Product Analytics & Monitoring</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          {/* 5. Google Analytics 4 */}
          <IntegrationCard
            icon={<Globe className="w-5 h-5" />}
            title="Google Analytics 4"
            description="ניתוח מבקרים, מקורות תעבורה ומעקב אירועים — מוגדר עם מזהה G-MRNPP7GEFB."
            status="active"
            accent="orange"
            features={["Real-time Users", "Audience Insights", "Traffic Sources", "Event Tracking", "Funnels"]}
            actions={
              <>
                <ActionButton
                  href="https://analytics.google.com/analytics/web/#/p528142013"
                  variant="primary"
                  icon={<BarChart3 className="w-3 h-3" />}
                >
                  GA4 Dashboard
                </ActionButton>
                <ActionButton
                  href="/admin/google-analytics"
                  icon={<Activity className="w-3 h-3" />}
                >
                  Admin GA Page
                </ActionButton>
              </>
            }
            extra={
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-600">Measurement ID:</span>
                <EnvVarBadge name="G-MRNPP7GEFB" />
              </div>
            }
          />

          {/* 6. PostHog */}
          <IntegrationCard
            icon={<FlaskConical className="w-5 h-5" />}
            title="PostHog"
            description="אנליטיקות מוצר, feature flags, הקלטת סשנים ופאנלים — פעיל ומחובר."
            status="active"
            accent="purple"
            features={["Event Tracking", "Feature Flags", "Session Recording", "Funnels", "Cohorts"]}
            actions={
              <>
                <ActionButton
                  href={posthogHost}
                  variant="primary"
                  icon={<ExternalLink className="w-3 h-3" />}
                >
                  פתח PostHog
                </ActionButton>
                <ActionButton
                  href="/admin/experiments"
                  icon={<FlaskConical className="w-3 h-3" />}
                >
                  Experiments
                </ActionButton>
              </>
            }
          />

          {/* 7. Sentry */}
          <IntegrationCard
            icon={<AlertTriangle className="w-5 h-5" />}
            title="Sentry"
            description="מעקב שגיאות ובאגים בזמן אמת — כולל ביצועים ו-release tracking."
            status="active"
            accent="rose"
            features={["Error Tracking", "Performance Monitoring", "Release Tracking", "Alerts", "Source Maps"]}
            actions={
              <>
                <ActionButton
                  href="https://sentry.io/"
                  variant="primary"
                  icon={<AlertTriangle className="w-3 h-3" />}
                >
                  Sentry Dashboard
                </ActionButton>
              </>
            }
          />

          {/* 8. Better Stack */}
          <IntegrationCard
            icon={<Clock className="w-5 h-5" />}
            title="Better Stack"
            description="ניטור זמינות האתר עם התראות SMS/מייל ודף סטטוס ציבורי."
            status="not-configured"
            accent="cyan"
            features={["Uptime Monitoring", "SMS / Email Alerts", "Status Page", "Incident Management"]}
            actions={
              <>
                <ActionButton
                  href="https://betterstack.com/better-uptime"
                  variant="primary"
                  icon={<ExternalLink className="w-3 h-3" />}
                >
                  Sign Up Free
                </ActionButton>
              </>
            }
            setup={
              <SetupPanel>
                <SetupStep step={1} text="הירשם חינם ב-betterstack.com/better-uptime" />
                <SetupStep step={2} text="הוסף monitor ל-https://peroot.space" />
                <SetupStep step={3} text="הוסף monitor ל-https://peroot.space/api/health" />
                <SetupStep step={4} text="הוסף monitor ל-https://peroot.space/api/enhance" />
                <SetupStep step={5} text="הגדר התראות מייל/SMS ודף סטטוס ציבורי" />
              </SetupPanel>
            }
          />

        </div>

        {/* ── Security Group Header ── */}
        <div className="px-1 pt-2">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">Security & Infrastructure</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          {/* 9. HSTS Preload */}
          <IntegrationCard
            icon={<Shield className="w-5 h-5" />}
            title="HSTS Preload"
            description="כותרת HSTS מוגדרת — נדרש לאמת שה-www subdomain עם HTTPS לפני הגשה."
            status="needs-setup"
            accent="emerald"
            features={["HTTPS Enforcement", "Browser Preload List", "MITM Protection", "Redirect www"]}
            actions={
              <>
                <ActionButton
                  href="https://hstspreload.org/?domain=peroot.space"
                  variant="primary"
                  icon={<CheckCircle2 className="w-3 h-3" />}
                >
                  בדוק סטטוס HSTS
                </ActionButton>
                <ActionButton
                  href="https://vercel.com/sassongal/web/settings/domains"
                  icon={<Globe className="w-3 h-3" />}
                >
                  הוסף www ב-Vercel
                </ActionButton>
              </>
            }
            setup={
              <SetupPanel>
                <SetupStep step={1} text="היכנס ל-Vercel → Settings → Domains" />
                <SetupStep step={2} text="הוסף www.peroot.space כ-redirect domain לפרויקט" />
                <SetupStep step={3} text="ודא שה-HTTPS עובד על www.peroot.space" />
                <SetupStep step={4} text="היכנס ל-hstspreload.org?domain=peroot.space ולחץ Submit" />
                <SetupStep step={5} text="ההכנסה לרשימה לוקחת עד כמה שבועות" />
              </SetupPanel>
            }
          />

        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between text-[9px] font-bold text-zinc-700 uppercase tracking-widest px-2 pt-4">
          <span>Peroot Integrations Hub</span>
          <span className="flex items-center gap-1">
            <Plug className="w-3 h-3" />
            9 שירותים מנוטרים
          </span>
        </div>

      </div>
    </AdminLayout>
  );
}
