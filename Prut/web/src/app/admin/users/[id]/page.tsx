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
  created_at: string;
  use_count?: number;
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
  personality: {
    style_tokens: string[];
    personality_brief: string;
    preferred_format: string;
  } | null;
  achievementCount: number;
  promptCount: number;
  totalApiCost: number;
  recentActivity: ActivityLog[];
}

type Tab = "overview" | "activity" | "prompts";

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

  // Activity load-more
  const [activityVisible, setActivityVisible] = useState(10);

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
      setTierValue(json.profile.plan_tier ?? "free");
    } catch (err) {
      logger.error(err);
      toast.error("Failed to load user details");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch prompts (lazy)
  const fetchPrompts = useCallback(async () => {
    if (promptsLoaded) return;
    setLoadingPrompts(true);
    try {
      // We use a direct supabase call would be ideal but to stay consistent
      // with admin API pattern we fetch from the supabase client here
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("personal_library")
        .select("id, title, created_at, use_count")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setPrompts(data ?? []);
      setPromptsLoaded(true);
    } catch (err) {
      logger.error(err);
      toast.error("Failed to load prompts");
    } finally {
      setLoadingPrompts(false);
    }
  }, [userId, promptsLoaded]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    if (activeTab === "prompts") {
      fetchPrompts();
    }
  }, [activeTab, fetchPrompts]);

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

  const { profile, role, subscription, stats, personality, achievementCount, promptCount, totalApiCost, recentActivity } = detail;
  const isBanned = profile.is_banned ?? false;
  const isAdmin = role?.role === "admin";
  const email = profile.email ?? subscription?.customer_email ?? "unknown";
  const displayName = subscription?.customer_name ?? email;

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
            className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-zinc-600 hover:text-white transition-all active:scale-95"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        </div>

        {/* Main content + Sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Tabs Area */}
          <div className="xl:col-span-2 space-y-6">

            {/* Tab Switcher */}
            <div className="flex p-1.5 bg-zinc-950/50 border border-white/5 rounded-[28px] gap-1">
              {(["overview", "activity", "prompts"] as Tab[]).map((tab) => (
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
                  {tab === "overview" ? "Overview" : tab === "activity" ? "Activity" : "Prompts"}
                </button>
              ))}
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
                  {personality ? (
                    <div className="space-y-4">
                      {personality.style_tokens.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {personality.style_tokens.map((token, i) => (
                            <span
                              key={i}
                              className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider"
                            >
                              {token}
                            </span>
                          ))}
                        </div>
                      )}
                      {personality.personality_brief && (
                        <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                          {personality.personality_brief}
                        </p>
                      )}
                      {personality.preferred_format && (
                        <InfoRow label="Preferred Format" value={personality.preferred_format} />
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
              </div>
            )}

            {/* ── Activity Tab ── */}
            {activeTab === "activity" && (
              <div className="space-y-4">
                <div className="rounded-[40px] border border-white/5 bg-zinc-950/80 overflow-hidden">
                  {recentActivity.length === 0 ? (
                    <p className="text-center text-zinc-800 font-black uppercase tracking-widest text-[9px] py-20">
                      No activity recorded
                    </p>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {recentActivity.slice(0, activityVisible).map((log) => (
                        <div key={log.id} className="px-8 py-5 flex items-start gap-5 hover:bg-white/[0.02] transition-all">
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

                {activityVisible < recentActivity.length && (
                  <button
                    onClick={() => setActivityVisible((v) => v + 10)}
                    className="w-full py-4 rounded-2xl bg-white/[0.03] border border-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <ChevronDown className="w-4 h-4" />
                    Load More
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
                    {prompts.map((p) => (
                      <div
                        key={p.id}
                        className="px-8 py-5 flex items-center gap-5 hover:bg-white/[0.02] transition-all"
                      >
                        <div className="p-2 rounded-xl bg-zinc-900 border border-white/5 shrink-0">
                          <BookOpen className="w-3.5 h-3.5 text-zinc-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-zinc-300 truncate">
                            {p.title || "Untitled Prompt"}
                          </p>
                          <p className="text-[9px] text-zinc-700 font-bold uppercase">
                            {fmtDate(p.created_at)}
                          </p>
                        </div>
                        {p.use_count !== undefined && (
                          <span className="text-[9px] font-black text-zinc-600 bg-white/5 px-2.5 py-1 rounded-lg uppercase tracking-wider shrink-0">
                            {p.use_count}x used
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                  <option value="premium">Premium</option>
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

              <Divider />

              {/* Admin Role */}
              <div className="space-y-3">
                <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.25em]">
                  Admin Role
                </label>
                <button
                  onClick={() => {
                    if (
                      !confirm(
                        `${isAdmin ? "Revoke" : "Grant"} admin role for this user?`
                      )
                    )
                      return;
                    doAction(isAdmin ? "revoke_admin" : "grant_admin");
                  }}
                  disabled={!!actionLoading}
                  className={cn(
                    "w-full py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 border",
                    isAdmin
                      ? "bg-zinc-800 border-white/10 text-zinc-400 hover:bg-zinc-700"
                      : "bg-blue-600/10 border-blue-600/20 text-blue-400 hover:bg-blue-600/20"
                  )}
                >
                  {actionLoading === "grant_admin" || actionLoading === "revoke_admin" ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Crown className="w-4 h-4" />
                  )}
                  {isAdmin ? "Revoke Admin" : "Grant Admin"}
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
