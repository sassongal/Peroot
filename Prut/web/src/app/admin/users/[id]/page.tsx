"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useI18n } from "@/context/I18nContext";
import { getApiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowRight,
  User,
  Shield,
  Zap,
  Crown,
  Ban,
  Activity,
  BookOpen,
  RefreshCw,
  ChevronDown,
  Trophy,
  DollarSign,
  Layers,
  Clock,
  Tag,
  Sparkles,
  BarChart2,
  Mail,
  CheckCircle,
  Circle,
  XCircle,
} from "lucide-react";
import { logger } from "@/lib/logger";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActivityLog {
  id: string;
  action: string;
  created_at: string;
  details: Record<string, unknown> | null;
}

interface PromptItem {
  id: string;
  title: string;
  prompt?: string;
  created_at: string;
  use_count?: number;
}

interface HistoryItem {
  id: string;
  prompt: string;
  enhanced_prompt: string;
  tone: string;
  category: string;
  capability_mode: string;
  title: string | null;
  source: string;
  created_at: string;
}

interface CreditLedgerEntry {
  id: string;
  delta: number;
  balance_after: number;
  reason: string;
  source: string;
  created_at: string;
}

interface ApiCallEntry {
  provider: string;
  model: string;
  engine_mode: string | null;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  created_at: string;
}

interface UserDetail {
  profile: {
    id: string;
    email?: string;
    plan_tier: string;
    credits_balance: number;
    is_banned?: boolean;
    created_at: string;
    updated_at: string;
    tags?: string[];
    churned_at?: string;
  };
  role: { role: string } | null;
  subscription: {
    plan_name: string;
    status: string;
    renews_at: string;
    customer_email: string;
    customer_name: string;
  } | null;
  stats: {
    rank_title: string;
    contribution_score: number;
    total_copies: number;
  } | null;
  stylePersonality: {
    style_tokens: string[];
    personality_brief: string;
    preferred_format: string;
  } | null;
  achievementCount: number;
  promptCount: number;
  totalApiCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  recentApiCalls: ApiCallEntry[];
  recentActivity: ActivityLog[];
  historyCount: number;
  recentHistory: HistoryItem[];
  sourceBreakdown: Record<string, number>;
  topCategories: [string, number][];
  topTones: [string, number][];
  topModes: [string, number][];
  lastActive: string;
  creditLedger: CreditLedgerEntry[];
}

type Tab = "overview" | "activity" | "prompts" | "history" | "tokens" | "credits" | "emails";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtCost(n: number) {
  return `$${n.toFixed(4)}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function tierColor(tier: string) {
  const t = tier.toLowerCase();
  if (t.includes("pro") || t.includes("premium"))
    return "bg-amber-500/10 border-amber-500/20 text-amber-400";
  return "bg-white/5 border-white/5 text-zinc-500";
}

function initials(email: string) {
  return email ? email[0].toUpperCase() : "U";
}

function sourceColor(source: string) {
  if (source === "extension")
    return "bg-purple-500/10 border-purple-500/20 text-purple-400";
  return "bg-blue-500/10 border-blue-500/20 text-blue-400";
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function UserDetailPage() {
  const params = useParams();
  const userId = params?.id as string;
  useI18n(); // keep context alive

  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Prompts tab state
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [promptsLoaded, setPromptsLoaded] = useState(false);
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());

  // History tab state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());

  // Activity tab state (real server pagination)
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [activityOffset, setActivityOffset] = useState(0);
  const [activityTotal, setActivityTotal] = useState(0);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Admin action state
  const [tierValue, setTierValue] = useState("free");
  const [creditAmount, setCreditAmount] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch detail
  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiPath(`/api/admin/users/${userId}`));
      if (!res.ok) throw new Error("Failed to fetch user detail");
      const json: UserDetail = await res.json();
      setDetail(json);
      setTierValue(json.role?.role === "admin" ? "admin" : (json.profile.plan_tier ?? "free"));
      // Seed history from recentHistory in the main response
      if (json.recentHistory?.length) {
        setHistory(json.recentHistory);
        setHistoryOffset(json.recentHistory.length);
        setHistoryTotal(json.historyCount ?? json.recentHistory.length);
      }
    } catch (err) {
      logger.error(err);
      toast.error("Failed to load user details");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch prompts (lazy) via admin API
  const fetchPrompts = useCallback(async () => {
    if (promptsLoaded) return;
    setLoadingPrompts(true);
    try {
      const res = await fetch(
        getApiPath(`/api/admin/users/${userId}/prompts?tab=prompts&limit=50`)
      );
      if (!res.ok) throw new Error("Failed to fetch prompts");
      const json: { tab: string; items: PromptItem[]; total: number } =
        await res.json();
      setPrompts(json.items ?? []);
      setPromptsLoaded(true);
    } catch (err) {
      logger.error(err);
      toast.error("Failed to load prompts");
    } finally {
      setLoadingPrompts(false);
    }
  }, [userId, promptsLoaded]);

  // Load more history
  const loadMoreHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(
        getApiPath(
          `/api/admin/users/${userId}/prompts?tab=history&limit=20&offset=${historyOffset}`
        )
      );
      if (!res.ok) throw new Error("Failed to fetch history");
      const json: {
        tab: string;
        items: HistoryItem[];
        total: number;
        limit: number;
        offset: number;
      } = await res.json();
      setHistory((prev) => [...prev, ...(json.items ?? [])]);
      setHistoryOffset((prev) => prev + (json.items?.length ?? 0));
      setHistoryTotal(json.total ?? 0);
    } catch (err) {
      logger.error(err);
      toast.error("Failed to load more history");
    } finally {
      setLoadingHistory(false);
    }
  }, [userId, historyOffset]);

  // Fetch/load-more activity from dedicated paginated endpoint
  const fetchActivity = useCallback(async (reset = false) => {
    setLoadingActivity(true);
    const offset = reset ? 0 : activityOffset;
    try {
      const res = await fetch(
        getApiPath(`/api/admin/users/${userId}/activity?limit=50&offset=${offset}`)
      );
      if (!res.ok) throw new Error("Failed to fetch activity");
      const json: { logs: ActivityLog[]; total: number } = await res.json();
      setActivity((prev) => (reset ? json.logs : [...prev, ...json.logs]));
      setActivityOffset(offset + (json.logs?.length ?? 0));
      setActivityTotal(json.total ?? 0);
    } catch (err) {
      logger.error(err);
      toast.error("Failed to load activity");
    } finally {
      setLoadingActivity(false);
    }
  }, [userId, activityOffset]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    if (activeTab === "prompts") {
      fetchPrompts();
    }
    if (activeTab === "activity" && activity.length === 0) {
      fetchActivity(true);
    }
  }, [activeTab, fetchPrompts, fetchActivity, activity.length]);

  // Admin action
  async function doAction(action: string, value?: string | number) {
    setActionLoading(action);
    try {
      const res = await fetch(getApiPath(`/api/admin/users/${userId}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, value }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed");
      toast.success(`Action "${action}" completed`);
      fetchDetail();
    } catch (err: unknown) {
      logger.error(err);
      toast.error(
        err instanceof Error ? err.message : "Action failed"
      );
    } finally {
      setActionLoading(null);
    }
  }

  function toggleExpandedSet(
    set: Set<string>,
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    id: string
  ) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-40 gap-6">
          <Layers className="w-12 h-12 text-blue-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">
            Loading User Profile...
          </span>
        </div>
      </AdminLayout>
    );
  }

  if (!detail) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-40 gap-6">
          <User className="w-12 h-12 text-red-500/30" />
          <span className="text-zinc-600 font-black uppercase tracking-widest text-sm">
            User not found
          </span>
          <Link
            href="/admin/users"
            className="px-6 py-3 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all"
          >
            Back to Users
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const {
    profile,
    role,
    subscription,
    stats,
    stylePersonality,
    achievementCount,
    promptCount,
    totalApiCost,
    totalInputTokens,
    totalOutputTokens,
    recentApiCalls,
    recentActivity,
    historyCount,
    sourceBreakdown,
    topCategories,
    topTones,
    topModes,
    lastActive,
    creditLedger,
  } = detail;
  const isBanned = profile.is_banned ?? false;
  const isAdmin = role?.role === "admin";
  const email = profile.email ?? subscription?.customer_email ?? "unknown";
  const displayName = subscription?.customer_name ?? email;

  const hasInsights =
    topCategories?.length > 0 ||
    Object.keys(sourceBreakdown ?? {}).length > 0;

  const sourceTotal = Object.values(sourceBreakdown ?? {}).reduce(
    (a, b) => a + b,
    0
  );

  return (
    <AdminLayout>
      <div className="space-y-10 animate-in fade-in duration-700 pb-20" dir="rtl">

        {/* Back Button */}
        <Link
          href="/admin/users"
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors group w-fit"
        >
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          <span className="font-bold">Back to Users</span>
        </Link>

        {/* User Header Card */}
        <div className="bg-zinc-950/50 rounded-[40px] border border-white/5 p-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-[28px] bg-zinc-900 border border-white/5 flex items-center justify-center text-3xl font-black text-zinc-300 shadow-2xl">
              {initials(email)}
            </div>
            {!isBanned && (
              <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full border-4 border-zinc-950 bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <span
                className={cn(
                  "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border",
                  tierColor(profile.plan_tier)
                )}
              >
                {profile.plan_tier?.toUpperCase() || "FREE"}
              </span>
              {isAdmin && (
                <span className="px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-widest">
                  Admin
                </span>
              )}
              {isBanned && (
                <span className="px-3 py-1 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-widest">
                  Banned
                </span>
              )}
              {profile.tags?.map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border",
                    tag === "churn"
                      ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
                      : "bg-zinc-500/10 border-zinc-500/20 text-zinc-400"
                  )}
                >
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight leading-none">
              {displayName}
            </h1>
            {subscription?.customer_name && (
              <p className="text-zinc-400 font-medium">{email}</p>
            )}
            <p className="text-[9px] text-zinc-700 font-black uppercase tracking-widest">
              ID: {profile.id}
            </p>
            <div className="flex flex-wrap gap-6 pt-1">
              <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-bold">
                <Clock className="w-3.5 h-3.5 text-zinc-700" />
                Member since {fmtDate(profile.created_at)}
              </div>
              {profile.updated_at && (
                <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-bold">
                  <Activity className="w-3.5 h-3.5 text-zinc-700" />
                  Last updated {timeAgo(profile.updated_at)}
                </div>
              )}
            </div>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchDetail}
            disabled={loading}
            className="p-3 rounded-2xl bg-white/3 border border-white/5 text-zinc-600 hover:text-white transition-all active:scale-95"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
          <QuickStat
            label="Prompts"
            value={promptCount}
            icon={BookOpen}
            color="blue"
          />
          <QuickStat
            label="API Cost"
            value={fmtCost(totalApiCost)}
            icon={DollarSign}
            color="emerald"
          />
          <QuickStat
            label="Input Tokens"
            value={(totalInputTokens ?? 0).toLocaleString()}
            icon={Layers}
            color="blue"
          />
          <QuickStat
            label="Output Tokens"
            value={(totalOutputTokens ?? 0).toLocaleString()}
            icon={Sparkles}
            color="purple"
          />
          <QuickStat
            label="Credits"
            value={profile.credits_balance ?? 0}
            icon={Zap}
            color="amber"
          />
          <QuickStat
            label="Achievements"
            value={achievementCount}
            icon={Trophy}
            color="purple"
          />
          <QuickStat
            label="Generations"
            value={historyCount ?? 0}
            icon={Sparkles}
            color="blue"
          />
          <QuickStat
            label="Last Active"
            value={lastActive ? timeAgo(lastActive) : "—"}
            icon={Activity}
            color="emerald"
          />
        </div>

        {/* Main content + Sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Tabs Area */}
          <div className="xl:col-span-2 space-y-6">

            {/* Tab Switcher */}
            <div className="flex p-1.5 bg-zinc-950/50 border border-white/5 rounded-[28px] gap-1">
              {(["overview", "activity", "prompts", "history", "tokens", "credits", "emails"] as Tab[]).map((tab) => {
                const labels: Record<Tab, string> = {
                  overview: "Overview",
                  activity: "Activity",
                  prompts: "Prompts",
                  history: "History",
                  tokens: "Tokens",
                  credits: "Credits",
                  emails: "Emails",
                };
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                      activeTab === tab
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                        : "text-zinc-600 hover:text-zinc-300"
                    )}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            {/* ── Overview Tab ── */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Subscription */}
                <Panel title="Subscription" icon={Crown} color="amber">
                  {subscription ? (
                    <div className="grid grid-cols-2 gap-6">
                      <InfoRow label="Plan" value={subscription.plan_name} />
                      <InfoRow label="Status" value={subscription.status} highlight={subscription.status === "active"} />
                      <InfoRow label="Customer" value={subscription.customer_name || "-"} />
                      <InfoRow
                        label="Renews"
                        value={subscription.renews_at ? fmtDate(subscription.renews_at) : "-"}
                      />
                    </div>
                  ) : (
                    <p className="text-zinc-700 text-sm font-bold uppercase tracking-widest text-center py-8">
                      No active subscription
                    </p>
                  )}
                </Panel>

                {/* Style Personality */}
                <Panel title="Style Personality" icon={Tag} color="blue">
                  {stylePersonality ? (
                    <div className="space-y-4">
                      {stylePersonality.style_tokens.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {stylePersonality.style_tokens.map((token, i) => (
                            <span
                              key={i}
                              className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider"
                            >
                              {token}
                            </span>
                          ))}
                        </div>
                      )}
                      {stylePersonality.personality_brief && (
                        <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                          {stylePersonality.personality_brief}
                        </p>
                      )}
                      {stylePersonality.preferred_format && (
                        <InfoRow label="Preferred Format" value={stylePersonality.preferred_format} />
                      )}
                    </div>
                  ) : (
                    <p className="text-zinc-700 text-sm font-bold uppercase tracking-widest text-center py-8">
                      No personality data
                    </p>
                  )}
                </Panel>

                {/* Rank / Stats */}
                {stats && (
                  <Panel title="Rank & Stats" icon={Trophy} color="purple">
                    <div className="grid grid-cols-3 gap-6">
                      <InfoRow label="Rank" value={stats.rank_title || "-"} />
                      <InfoRow label="Contribution Score" value={stats.contribution_score ?? 0} />
                      <InfoRow label="Total Copies" value={stats.total_copies ?? 0} />
                    </div>
                  </Panel>
                )}

                {/* Usage Insights */}
                {hasInsights && (
                  <Panel title="Usage Insights" icon={BarChart2} color="blue">
                    <div className="space-y-6">

                      {/* Source Breakdown */}
                      {sourceTotal > 0 && (
                        <div className="space-y-3">
                          <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">
                            Source Breakdown
                          </span>
                          <div className="space-y-2">
                            {Object.entries(sourceBreakdown).map(([src, count]) => {
                              const pct = sourceTotal > 0
                                ? Math.round((count / sourceTotal) * 100)
                                : 0;
                              return (
                                <div key={src} className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span
                                      className={cn(
                                        "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                                        sourceColor(src)
                                      )}
                                    >
                                      {src}
                                    </span>
                                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                                      {count} ({pct}%)
                                    </span>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all",
                                        src === "extension"
                                          ? "bg-purple-500/60"
                                          : "bg-blue-500/60"
                                      )}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Top Categories */}
                      {topCategories?.length > 0 && (
                        <div className="space-y-3">
                          <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">
                            Top Categories
                          </span>
                          <div className="space-y-1.5">
                            {topCategories.slice(0, 5).map(([cat, count]) => (
                              <div
                                key={cat}
                                className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-white/2 border border-white/5"
                              >
                                <span className="text-xs font-bold text-zinc-400 truncate">
                                  {cat}
                                </span>
                                <span className="text-[9px] font-black text-zinc-600 bg-white/5 px-2 py-0.5 rounded-lg uppercase tracking-wider shrink-0 ml-3">
                                  {count}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Top Tones */}
                      {topTones?.length > 0 && (
                        <div className="space-y-3">
                          <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">
                            Top Tones
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {topTones.slice(0, 6).map(([tone, count]) => (
                              <div
                                key={tone}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/2 border border-white/5"
                              >
                                <span className="text-[10px] font-bold text-zinc-400">
                                  {tone}
                                </span>
                                <span className="text-[9px] font-black text-zinc-600">
                                  {count}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Top Modes */}
                      {topModes?.length > 0 && (
                        <div className="space-y-3">
                          <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">
                            Top Modes
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {topModes.slice(0, 6).map(([mode, count]) => (
                              <div
                                key={mode}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/2 border border-white/5"
                              >
                                <span className="text-[10px] font-bold text-zinc-400">
                                  {mode}
                                </span>
                                <span className="text-[9px] font-black text-zinc-600">
                                  {count}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Panel>
                )}
              </div>
            )}

            {/* ── Activity Tab ── */}
            {activeTab === "activity" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">
                    {activityTotal > 0 ? `${activityTotal} total actions` : "Activity"}
                  </span>
                  <button
                    onClick={() => { setActivity([]); setActivityOffset(0); fetchActivity(true); }}
                    className="text-[9px] font-black uppercase tracking-widest text-zinc-700 hover:text-zinc-400 transition-colors"
                  >
                    Refresh
                  </button>
                </div>

                <div className="rounded-[40px] border border-white/5 bg-zinc-950/80 overflow-hidden">
                  {loadingActivity && activity.length === 0 ? (
                    <div className="flex items-center justify-center py-20">
                      <RefreshCw className="w-8 h-8 animate-spin text-blue-500/20" />
                    </div>
                  ) : activity.length === 0 ? (
                    <p className="text-center text-zinc-800 font-black uppercase tracking-widest text-[9px] py-20">
                      No activity recorded
                    </p>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {activity.map((log) => (
                        <div key={log.id} className="px-8 py-5 flex items-start gap-5 hover:bg-white/2 transition-all">
                          <div className="mt-0.5 p-2 rounded-xl bg-zinc-900 border border-white/5 shrink-0">
                            <Activity className="w-3.5 h-3.5 text-zinc-600" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <span className="text-sm font-bold text-zinc-300">
                              {log.action}
                            </span>
                            {log.details && Object.keys(log.details).length > 0 && (
                              <p className="text-[10px] text-zinc-700 font-mono truncate max-w-xs">
                                {JSON.stringify(log.details).slice(0, 80)}…
                              </p>
                            )}
                          </div>
                          <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest whitespace-nowrap shrink-0">
                            {timeAgo(log.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {activity.length < activityTotal && (
                  <button
                    onClick={() => fetchActivity(false)}
                    disabled={loadingActivity}
                    className="w-full py-4 rounded-2xl bg-white/3 border border-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    {loadingActivity
                      ? <RefreshCw className="w-4 h-4 animate-spin" />
                      : <ChevronDown className="w-4 h-4" />
                    }
                    {loadingActivity ? "Loading…" : `Load More (${activityTotal - activity.length} remaining)`}
                  </button>
                )}
              </div>
            )}

            {/* ── Prompts Tab ── */}
            {activeTab === "prompts" && (
              <div className="rounded-[40px] border border-white/5 bg-zinc-950/80 overflow-hidden">
                {loadingPrompts ? (
                  <div className="flex items-center justify-center py-20">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-500/20" />
                  </div>
                ) : prompts.length === 0 ? (
                  <p className="text-center text-zinc-800 font-black uppercase tracking-widest text-[9px] py-20">
                    No prompts saved
                  </p>
                ) : (
                  <div className="divide-y divide-white/5">
                    {prompts.map((p) => {
                      const isExpanded = expandedPrompts.has(p.id);
                      const hasPromptText = !!p.prompt;
                      return (
                        <div
                          key={p.id}
                          className="px-8 py-5 hover:bg-white/2 transition-all"
                        >
                          <div className="flex items-center gap-5">
                            <div className="p-2 rounded-xl bg-zinc-900 border border-white/5 shrink-0">
                              <BookOpen className="w-3.5 h-3.5 text-zinc-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-zinc-300 truncate">
                                {p.title || "Untitled Prompt"}
                              </p>
                              {hasPromptText && !isExpanded && (
                                <p className="text-[11px] text-zinc-600 mt-1 truncate">
                                  {p.prompt!.slice(0, 100)}
                                  {p.prompt!.length > 100 ? "…" : ""}
                                </p>
                              )}
                              <p className="text-[9px] text-zinc-700 font-bold uppercase mt-1">
                                {fmtDate(p.created_at)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {p.use_count !== undefined && (
                                <span className="text-[9px] font-black text-zinc-600 bg-white/5 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                                  {p.use_count}x used
                                </span>
                              )}
                              {hasPromptText && (
                                <button
                                  onClick={() =>
                                    toggleExpandedSet(
                                      expandedPrompts,
                                      setExpandedPrompts,
                                      p.id
                                    )
                                  }
                                  className="p-1.5 rounded-lg text-zinc-700 hover:text-zinc-400 transition-colors"
                                >
                                  <ChevronDown
                                    className={cn(
                                      "w-3.5 h-3.5 transition-transform",
                                      isExpanded && "rotate-180"
                                    )}
                                  />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Expanded prompt text */}
                          {isExpanded && hasPromptText && (
                            <div className="mt-4 ml-10 p-4 rounded-2xl bg-zinc-900/60 border border-white/5">
                              <p className="text-[11px] font-black text-zinc-600 uppercase tracking-widest mb-2">
                                Prompt Text
                              </p>
                              <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">
                                {p.prompt}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── History Tab ── */}
            {activeTab === "history" && (
              <div className="space-y-4">
                {history.length === 0 ? (
                  <div className="rounded-[40px] border border-white/5 bg-zinc-950/80">
                    <p className="text-center text-zinc-800 font-black uppercase tracking-widest text-[9px] py-20">
                      No generation history
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((item) => {
                      const isExpanded = expandedHistory.has(item.id);
                      return (
                        <div
                          key={item.id}
                          className="rounded-[32px] border border-white/5 bg-zinc-950/80 overflow-hidden"
                        >
                          {/* Header row */}
                          <button
                            onClick={() =>
                              toggleExpandedSet(
                                expandedHistory,
                                setExpandedHistory,
                                item.id
                              )
                            }
                            className="w-full px-7 py-5 flex items-start gap-4 hover:bg-white/2 transition-all text-right"
                          >
                            <div className="p-2 rounded-xl bg-zinc-900 border border-white/5 shrink-0 mt-0.5">
                              <Sparkles className="w-3.5 h-3.5 text-zinc-600" />
                            </div>

                            <div className="flex-1 min-w-0 space-y-2">
                              {/* Badges row */}
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {item.tone && (
                                  <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/5 text-zinc-500 text-[9px] font-black uppercase tracking-wider">
                                    {item.tone}
                                  </span>
                                )}
                                {item.category && (
                                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black uppercase tracking-wider">
                                    {item.category}
                                  </span>
                                )}
                                {item.capability_mode && (
                                  <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-wider">
                                    {item.capability_mode}
                                  </span>
                                )}
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border",
                                    sourceColor(item.source)
                                  )}
                                >
                                  {item.source}
                                </span>
                              </div>

                              {/* Original prompt preview */}
                              <p className="text-sm font-bold text-zinc-300 text-right leading-snug">
                                {item.prompt.slice(0, 100)}
                                {item.prompt.length > 100 && !isExpanded ? "…" : ""}
                              </p>

                              {/* Enhanced prompt preview */}
                              {!isExpanded && (
                                <p className="text-[11px] text-zinc-600 text-right leading-snug">
                                  {item.enhanced_prompt.slice(0, 100)}
                                  {item.enhanced_prompt.length > 100 ? "…" : ""}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest whitespace-nowrap">
                                {timeAgo(item.created_at)}
                              </span>
                              <ChevronDown
                                className={cn(
                                  "w-3.5 h-3.5 text-zinc-700 transition-transform",
                                  isExpanded && "rotate-180"
                                )}
                              />
                            </div>
                          </button>

                          {/* Expanded body */}
                          {isExpanded && (
                            <div className="px-7 pb-6 space-y-4">
                              {/* Original prompt */}
                              <div className="rounded-2xl bg-zinc-900/60 border border-white/5 p-5 space-y-2">
                                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                                  Original Prompt
                                </span>
                                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                  {item.prompt}
                                </p>
                              </div>

                              {/* Separator */}
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-white/5" />
                                <Sparkles className="w-3 h-3 text-zinc-700" />
                                <div className="flex-1 h-px bg-white/5" />
                              </div>

                              {/* Enhanced prompt */}
                              <div className="rounded-2xl bg-blue-950/20 border border-blue-500/10 p-5 space-y-2">
                                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
                                  Enhanced Prompt
                                </span>
                                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                  {item.enhanced_prompt}
                                </p>
                              </div>

                              {/* Metadata */}
                              <div className="flex items-center justify-between pt-1">
                                <div className="flex flex-wrap gap-1.5">
                                  {item.title && (
                                    <span className="text-[9px] font-bold text-zinc-600">
                                      {item.title}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">
                                  {fmtDate(item.created_at)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Load More */}
                {history.length < historyTotal && (
                  <button
                    onClick={loadMoreHistory}
                    disabled={loadingHistory}
                    className="w-full py-4 rounded-2xl bg-white/3 border border-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loadingHistory ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    Load More ({historyTotal - history.length} remaining)
                  </button>
                )}
              </div>
            )}

            {/* ── Tokens Tab ── */}
            {activeTab === "tokens" && (
              <div className="space-y-4">
                {/* Token totals */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-[28px] border border-white/5 bg-zinc-950/80 p-6 space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Total Input Tokens</p>
                    <p className="text-2xl font-black text-zinc-200">{(totalInputTokens ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="rounded-[28px] border border-white/5 bg-zinc-950/80 p-6 space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Total Output Tokens</p>
                    <p className="text-2xl font-black text-zinc-200">{(totalOutputTokens ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="rounded-[28px] border border-white/5 bg-zinc-950/80 p-6 space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Total API Cost</p>
                    <p className="text-2xl font-black text-emerald-400">{fmtCost(totalApiCost)}</p>
                  </div>
                </div>

                {/* Per-prompt API call timeline */}
                <div className="rounded-[40px] border border-white/5 bg-zinc-950/80 overflow-hidden">
                  {!recentApiCalls || recentApiCalls.length === 0 ? (
                    <p className="text-center text-zinc-800 font-black uppercase tracking-widest text-[9px] py-20">
                      No API calls recorded
                    </p>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {/* Header */}
                      <div className="px-8 py-3 grid grid-cols-6 gap-4">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-700 col-span-2">Model / Engine</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-700 text-right">In Tokens</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-700 text-right">Out Tokens</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-700 text-right">Cost</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-700 text-right">When</span>
                      </div>
                      {recentApiCalls.map((call, i) => (
                        <div key={i} className="px-8 py-4 grid grid-cols-6 gap-4 items-center hover:bg-white/2 transition-all">
                          <div className="col-span-2 space-y-0.5">
                            <p className="text-xs font-bold text-zinc-300 truncate">{call.model}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">
                              {call.engine_mode ?? call.provider}
                            </p>
                          </div>
                          <span className="text-xs font-mono text-blue-400 text-right">{(call.input_tokens).toLocaleString()}</span>
                          <span className="text-xs font-mono text-purple-400 text-right">{(call.output_tokens).toLocaleString()}</span>
                          <span className="text-xs font-mono text-emerald-400 text-right">{fmtCost(call.cost_usd)}</span>
                          <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest text-right whitespace-nowrap">
                            {timeAgo(call.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Credits Tab ── */}
            {activeTab === "credits" && (
              <div className="space-y-4">
                <div className="rounded-[40px] border border-white/5 bg-zinc-950/80 overflow-hidden">
                  {creditLedger.length === 0 ? (
                    <p className="text-center text-zinc-800 font-black uppercase tracking-widest text-[9px] py-20">
                      No credit history recorded
                    </p>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {creditLedger.map((entry) => {
                        const isPositive = entry.delta > 0;
                        const reasonLabels: Record<string, string> = {
                          registration_bonus: "Registration Bonus",
                          daily_reset: "Daily Reset",
                          subscription_grant: "Pro Credits",
                          spend: "Credit Spent",
                          refund: "Refund",
                          admin_grant: "Admin Grant",
                          admin_revoke: "Admin Revoke",
                          churn_revoke: "Churn Revoke",
                          referral_bonus: "Referral Bonus",
                        };
                        return (
                          <div key={entry.id} className="px-8 py-4 flex items-center gap-5 hover:bg-white/2 transition-all">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-black border",
                              isPositive
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : "bg-red-500/10 border-red-500/20 text-red-400"
                            )}>
                              {isPositive ? "+" : ""}{entry.delta}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-bold text-zinc-300">
                                {reasonLabels[entry.reason] || entry.reason}
                              </span>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">
                                  Balance: {entry.balance_after}
                                </span>
                                <span className="text-[9px] text-zinc-700 font-mono">
                                  {entry.source}
                                </span>
                              </div>
                            </div>
                            <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest whitespace-nowrap shrink-0">
                              {timeAgo(entry.created_at)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Emails Tab ── */}
            {activeTab === "emails" && (
              <EmailsTab userId={userId} />
            )}
          </div>

          {/* ── Admin Actions Sidebar ── */}
          <div className="space-y-6">
            <div className="rounded-[40px] border border-white/5 bg-zinc-950/80 p-8 space-y-8">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.25em] flex items-center gap-3">
                <Shield className="w-4 h-4 text-zinc-500" />
                Admin Actions
              </h3>

              {/* Change Tier */}
              <div className="space-y-3">
                <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em]">
                  Change Tier
                </label>
                <select
                  value={tierValue}
                  onChange={(e) => setTierValue(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/5 text-white rounded-2xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500/40 transition-colors"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={() => doAction("change_tier", tierValue)}
                  disabled={actionLoading === "change_tier"}
                  className="w-full py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading === "change_tier" ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : null}
                  Update Tier
                </button>
              </div>

              <Divider />

              {/* Credits */}
              <div className="space-y-3">
                <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em]">
                  Credits
                </label>
                <input
                  type="number"
                  min="1"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="Amount..."
                  className="w-full bg-zinc-900 border border-white/5 text-white rounded-2xl px-4 py-2.5 text-sm font-bold placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/40 transition-colors"
                />
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      const n = parseInt(creditAmount);
                      if (!n || n <= 0) return toast.error("Enter a positive number");
                      doAction("grant_credits", n);
                    }}
                    disabled={actionLoading === "grant_credits"}
                    className="py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {actionLoading === "grant_credits" ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    Grant
                  </button>
                  <button
                    onClick={() => {
                      const n = parseInt(creditAmount);
                      if (!n || n <= 0) return toast.error("Enter a positive number");
                      doAction("revoke_credits", n);
                    }}
                    disabled={actionLoading === "revoke_credits"}
                    className="py-3 bg-zinc-800 border border-white/5 text-zinc-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {actionLoading === "revoke_credits" ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    Revoke
                  </button>
                </div>
              </div>

              <Divider />

              {/* Ban / Unban */}
              <div className="space-y-3">
                <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em]">
                  Account Status
                </label>
                <button
                  onClick={() => {
                    if (!confirm(`${isBanned ? "Unban" : "Ban"} this user?`)) return;
                    doAction(isBanned ? "unban" : "ban");
                  }}
                  disabled={!!actionLoading}
                  className={cn(
                    "w-full py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 border",
                    isBanned
                      ? "bg-emerald-600/10 border-emerald-600/20 text-emerald-400 hover:bg-emerald-600/20"
                      : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                  )}
                >
                  {actionLoading === "ban" || actionLoading === "unban" ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Ban className="w-4 h-4" />
                  )}
                  {isBanned ? "Unban User" : "Ban User"}
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function QuickStat({
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
  const colors: Record<string, string> = {
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    purple: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  };

  return (
    <div className="group p-6 rounded-[32px] bg-zinc-950 border border-white/5 flex flex-col gap-4 transition-all duration-500 hover:border-white/10 hover:shadow-xl">
      <div className={cn("p-3 rounded-xl border w-fit shadow-xl", colors[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="space-y-0.5">
        <div className="text-3xl font-black text-white tracking-tighter leading-none">
          {value}
        </div>
        <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">
          {label}
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  color,
  children,
}: {
  title: string;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
}) {
  const iconColors: Record<string, string> = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };

  return (
    <div className="rounded-[40px] border border-white/5 bg-zinc-950/80 p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className={cn("p-2.5 rounded-xl border", iconColors[color] ?? iconColors.blue)}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-bold",
          highlight ? "text-emerald-400" : "text-zinc-300"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-white/5" />;
}

// ── Emails Tab ──────────────────────────────────────────────────────────────

interface EmailLogItem {
  id: string;
  source: string;
  type: string;
  subject: string | null;
  status: string;
  sentAt: string;
  metadata: Record<string, unknown> | null;
}

interface EmailData {
  email: string | null;
  userCreatedAt: string | null;
  onboarding: {
    status: string;
    currentStep: number;
    steps: Array<{
      step: number;
      name: string;
      delay: string;
      key: string;
      sent: boolean;
      current: boolean;
    }>;
    startedAt: string | null;
    lastSentAt: string | null;
    unsubscribed: boolean;
  };
  emails: EmailLogItem[];
  summary: {
    totalSent: number;
    totalFailed: number;
    sources: string[];
  };
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  resend: { label: 'Resend', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
  lemonsqueezy: { label: 'LemonSqueezy', color: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
  system: { label: 'System', color: 'bg-zinc-800 border-white/10 text-zinc-400' },
};

const TYPE_LABELS: Record<string, string> = {
  welcome: 'ברוכים הבאים',
  campaign: 'קמפיין',
  onboarding_welcome: 'ברוכים הבאים (אונבורדינג)',
  onboarding_day1: 'אונבורדינג יום 1',
  onboarding_day3: 'אונבורדינג יום 3',
  onboarding_day7: 'אונבורדינג יום 7',
  onboarding_day14: 'אונבורדינג יום 14',
  subscription_created: 'אישור מנוי',
  subscription_payment_success: 'קבלה',
  subscription_cancelled: 'ביטול מנוי',
  subscription_expired: 'מנוי פג תוקף',
  subscription_resumed: 'חידוש מנוי',
  subscription_payment_failed: 'תשלום נכשל',
  churn_notification: 'הודעת ביטול מנוי',
  admin_churn_alert: 'התראת מנהל — churn',
  transactional: 'הודעה',
};

function EmailsTab({ userId }: { userId: string }) {
  const [data, setData] = useState<EmailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(getApiPath(`/api/admin/users/${userId}/emails`));
        if (!res.ok) throw new Error("Failed");
        const json: EmailData = await res.json();
        setData(json);
      } catch {
        toast.error("Failed to load email data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500/20" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 text-center">
          <div className="text-2xl font-black text-white">{data.summary.totalSent}</div>
          <div className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">נשלחו</div>
        </div>
        <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 text-center">
          <div className="text-2xl font-black text-red-400">{data.summary.totalFailed}</div>
          <div className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">נכשלו</div>
        </div>
        <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 text-center">
          <div className="text-2xl font-black text-blue-400">{data.summary.sources.length}</div>
          <div className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">מקורות</div>
        </div>
      </div>

      {/* Onboarding Sequence */}
      <Panel title="רצף אונבורדינג" icon={Mail} color="blue">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">סטטוס:</span>
            <span className={cn(
              "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border",
              data.onboarding.status === 'active' && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
              data.onboarding.status === 'completed' && "bg-blue-500/10 border-blue-500/20 text-blue-400",
              data.onboarding.status === 'unsubscribed' && "bg-red-500/10 border-red-500/20 text-red-400",
              data.onboarding.status === 'not_started' && "bg-zinc-800 border-white/10 text-zinc-500",
            )}>
              {data.onboarding.status === 'active' ? 'פעיל' :
               data.onboarding.status === 'completed' ? 'הושלם' :
               data.onboarding.status === 'unsubscribed' ? 'בוטל' : 'לא התחיל'}
            </span>
          </div>

          <div className="space-y-3">
            {data.onboarding.steps.map((step) => {
              const StepIcon = step.sent ? CheckCircle : step.current ? Circle : XCircle;
              return (
                <div
                  key={step.step}
                  className={cn(
                    "flex items-center gap-4 px-5 py-3 rounded-2xl border transition-all",
                    step.sent && "bg-emerald-500/5 border-emerald-500/10",
                    step.current && "bg-blue-500/5 border-blue-500/10",
                    !step.sent && !step.current && "bg-zinc-900/50 border-white/5 opacity-40"
                  )}
                >
                  <StepIcon className={cn(
                    "w-4 h-4 shrink-0",
                    step.sent && "text-emerald-400",
                    step.current && "text-blue-400 animate-pulse",
                    !step.sent && !step.current && "text-zinc-700"
                  )} />
                  <div className="flex-1">
                    <span className="text-sm font-bold text-zinc-300">{step.name}</span>
                  </div>
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{step.delay}</span>
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-widest",
                    step.sent ? "text-emerald-500" : step.current ? "text-blue-400" : "text-zinc-700"
                  )}>
                    {step.sent ? "נשלח" : step.current ? "ממתין" : "טרם"}
                  </span>
                </div>
              );
            })}
          </div>

          {data.onboarding.lastSentAt && (
            <p className="text-[9px] text-zinc-600 font-bold">
              שליחה אחרונה: {new Date(data.onboarding.lastSentAt).toLocaleString('he-IL')}
            </p>
          )}
        </div>
      </Panel>

      {/* Complete Email History */}
      <Panel title="היסטוריית מיילים מלאה" icon={Mail} color="purple">
        {data.emails.length === 0 ? (
          <p className="text-zinc-700 text-sm font-bold uppercase tracking-widest text-center py-8">
            לא נשלחו מיילים
          </p>
        ) : (
          <div className="space-y-2">
            {data.emails.map((email) => {
              const sourceInfo = SOURCE_LABELS[email.source] || SOURCE_LABELS.system;
              const typeLabel = TYPE_LABELS[email.type] || email.type;
              const isFailed = email.status === 'failed';
              return (
                <div
                  key={email.id}
                  className={cn(
                    "flex items-center gap-4 px-5 py-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:bg-white/2 transition-all",
                    isFailed && "opacity-60 border-red-500/10"
                  )}
                >
                  <Mail className={cn("w-4 h-4 shrink-0", isFailed ? "text-red-400" : "text-zinc-400")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-300 truncate">
                      {email.subject || typeLabel}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn("px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border", sourceInfo.color)}>
                        {sourceInfo.label}
                      </span>
                      <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-wider">
                        {typeLabel}
                      </span>
                      {isFailed && (
                        <span className="px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-black uppercase">
                          נכשל
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-zinc-700 shrink-0">
                    {new Date(email.sentAt).toLocaleDateString('he-IL')}{' '}
                    {new Date(email.sentAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
