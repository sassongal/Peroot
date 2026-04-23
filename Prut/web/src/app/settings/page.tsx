"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  User as UserIcon,
  Shield,
  Loader2,
  ChevronLeft,
  BarChart3,
  CreditCard,
  Gift,
  AlertTriangle,
  LayoutDashboard,
  Brain,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useHistory } from "@/hooks/useHistory";
import { useLibrary } from "@/hooks/useLibrary";
import { useFavorites } from "@/hooks/useFavorites";
import { useSubscription } from "@/hooks/useSubscription";
import { useSearchParams } from "next/navigation";
import type { ActivityLogRow, UsageStatsState } from "@/components/settings/settings-types";
import { SettingsProfileSection } from "@/components/settings/SettingsProfileSection";
import { SettingsStatsSection } from "@/components/settings/SettingsStatsSection";
import { SettingsReferralSection } from "@/components/settings/SettingsReferralSection";
import { SettingsBillingSection } from "@/components/settings/SettingsBillingSection";
import { SettingsDataSection } from "@/components/settings/SettingsDataSection";
import { SettingsDangerSection } from "@/components/settings/SettingsDangerSection";
import { SettingsMemorySection } from "@/components/settings/SettingsMemorySection";
import { resolveAvatarUrl, avatarFallbackUrl as uiAvatarsFallback } from "@/lib/user-avatar";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const initialSection = searchParams.get("tab") || "profile";
  const billingSuccess = searchParams.get("success") === "true";
  const [activeSection, setActiveSection] = useState<string>(initialSection);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  const supabase = useMemo(() => createClient(), []);
  const { history, clearHistory } = useHistory();
  const { personalLibrary } = useLibrary();
  const { favorites } = useFavorites();
  const { subscription, isPro } = useSubscription();
  const [credits, setCredits] = useState<{
    balance: number;
    dailyLimit: number;
    refreshedAt: string | null;
  } | null>(null);
  const [referral, setReferral] = useState<{
    code: string;
    uses: number;
    maxUses: number;
    creditsPerReferral: number;
    totalReferrals: number;
  } | null>(null);
  const [referralLoaded, setReferralLoaded] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [usageStats, setUsageStats] = useState<UsageStatsState | null>(null);

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        setIsAdmin(!!roleRow);

        const [{ data: profile }, { data: settings }] = await Promise.all([
          supabase.from("profiles").select("display_name, credits_balance, credits_refreshed_at").eq("id", user.id).single(),
          supabase.from("site_settings").select("daily_free_limit").single(),
        ]);
        setDisplayName(
          profile?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || ""
        );
        setCredits({
          balance: profile?.credits_balance ?? 0,
          dailyLimit: settings?.daily_free_limit ?? 2,
          refreshedAt: profile?.credits_refreshed_at ?? null,
        });

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const [{ count: totalCount }, { count: monthCount }, { count: weekCount }, { data: recentActivity }] =
          await Promise.all([
            supabase
              .from("activity_logs")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id)
              .in("action", ["Prmpt Enhance", "Prmpt Refine"]),
            supabase
              .from("activity_logs")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id)
              .in("action", ["Prmpt Enhance", "Prmpt Refine"])
              .gte("created_at", startOfMonth),
            supabase
              .from("activity_logs")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id)
              .in("action", ["Prmpt Enhance", "Prmpt Refine"])
              .gte("created_at", startOfWeek),
            supabase
              .from("activity_logs")
              .select("created_at, details")
              .eq("user_id", user.id)
              .in("action", ["Prmpt Enhance", "Prmpt Refine"])
              .order("created_at", { ascending: false })
              .limit(100),
          ]);

        const catCounts: Record<string, number> = {};
        const dayCounts: Record<string, number> = {};
        let streak = 0;

        (recentActivity || []).forEach((log: { created_at: string; details: { mode?: string } | null }) => {
          const mode = log.details?.mode || "standard";
          catCounts[mode] = (catCounts[mode] || 0) + 1;
          const day = log.created_at.slice(0, 10);
          dayCounts[day] = (dayCounts[day] || 0) + 1;
        });

        const today = new Date();
        for (let i = 0; i < 30; i++) {
          const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
          const key = d.toISOString().slice(0, 10);
          if (dayCounts[key]) streak++;
          else if (i > 0) break;
        }

        const topCategories = Object.entries(catCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([category, count]) => ({ category, count }));

        const recentDays = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
          const key = d.toISOString().slice(0, 10);
          recentDays.push({ date: key, count: dayCounts[key] || 0 });
        }

        setUsageStats({
          totalEnhancements: totalCount || 0,
          thisMonth: monthCount || 0,
          thisWeek: weekCount || 0,
          streak,
          topCategories,
          recentDays,
        });

        try {
          const refRes = await fetch("/api/referral");
          if (refRes.ok) {
            const refData = await refRes.json();
            setReferral(refData);
          }
        } catch {
          // Referral system not yet set up
        } finally {
          setReferralLoaded(true);
        }
      }
      setLoading(false);
    }
    getUser();
  }, [supabase]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-slate-600 mx-auto" />
          <h1 className="text-2xl font-bold text-white">נדרשת התחברות</h1>
          <p className="text-slate-400">עליך להתחבר כדי לגשת להגדרות החשבון</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors"
          >
            <UserIcon className="w-4 h-4" />
            <span>התחבר עכשיו</span>
          </Link>
        </div>
      </main>
    );
  }

  const metadata = user.user_metadata || {};
  const avatarUrl = resolveAvatarUrl(user);

  const handleClearHistory = async () => {
    setIsClearingHistory(true);
    try {
      await clearHistory();
      toast.success("ההיסטוריה נמחקה בהצלחה");
    } catch {
      toast.error("שגיאה במחיקת ההיסטוריה");
    } finally {
      setIsClearingHistory(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const { data: rawActivityLogs } = await supabase
        .from("activity_logs")
        .select("id, action, entity_type, created_at, details")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);

      const activityLogs = (rawActivityLogs || []) as ActivityLogRow[];

      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name, credits_balance, credits_refreshed_at, plan_tier, created_at")
        .eq("id", user.id)
        .single();

      const exportData = {
        exportDate: new Date().toISOString(),
        userId: user.id,
        profile: {
          email: user.email,
          fullName: metadata.full_name || profileData?.display_name || null,
          displayName: profileData?.display_name || null,
          planTier: profileData?.plan_tier || "free",
          creditsBalance: profileData?.credits_balance ?? 0,
          creditsRefreshedAt: profileData?.credits_refreshed_at || null,
          accountCreatedAt: user.created_at,
          emailConfirmed: !!user.email_confirmed_at,
          lastSignIn: user.last_sign_in_at || null,
        },
        usageStats: usageStats
          ? {
              totalEnhancements: usageStats.totalEnhancements,
              thisMonth: usageStats.thisMonth,
              thisWeek: usageStats.thisWeek,
              streakDays: usageStats.streak,
              topCategories: usageStats.topCategories,
              recentDailyActivity: usageStats.recentDays,
            }
          : null,
        history: history,
        library: personalLibrary,
        favorites: favorites,
        achievements: [],
        activityLogs: activityLogs.map((log) => ({
          id: log.id,
          action: log.action,
          entityType: log.entity_type,
          createdAt: log.created_at,
          details: log.details,
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `peroot-data-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("הנתונים יורדו");
    } catch {
      toast.error("שגיאה בייצוא הנתונים");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "מחק את החשבון") {
      toast.error("אנא הקלד 'מחק את החשבון' לאישור");
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch("/api/user/delete-account", {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Delete failed");
      }

      await supabase.auth.signOut();

      toast.success("החשבון נמחק בהצלחה");
      window.location.href = "/";
    } catch {
      toast.error("שגיאה במחיקת החשבון");
      setIsDeleting(false);
    }
  };

  const handleSaveDisplayName = async () => {
    if (!user || !displayName.trim()) return;
    setIsSavingName(true);
    try {
      const { error } = await supabase.from("profiles").update({ display_name: displayName.trim() }).eq("id", user.id);
      if (error) throw error;
      toast.success("השם עודכן בהצלחה");
    } catch {
      toast.error("שגיאה בעדכון השם");
    } finally {
      setIsSavingName(false);
    }
  };

  const lsSubId = subscription.lemonsqueezy_subscription_id;
  const portalUrl = lsSubId
    ? `https://app.lemonsqueezy.com/my-orders/${lsSubId}`
    : "https://app.lemonsqueezy.com/my-orders";

  const sections = [
    { id: "profile", label: "פרופיל", icon: UserIcon },
    { id: "stats", label: "סטטיסטיקות", icon: BarChart3 },
    { id: "memory", label: "זיכרון AI", icon: Brain },
    { id: "referral", label: "הזמן חברים", icon: Gift },
    { id: "billing", label: "מנוי וחיוב", icon: CreditCard },
    { id: "data", label: "נתונים ופרטיות", icon: Shield },
    { id: "danger", label: "אזור מסוכן", icon: AlertTriangle },
  ];

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[150px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>חזרה</span>
          </Link>
          <div className="h-6 w-px bg-white/10" />
          <h1 className="text-2xl font-bold">הגדרות חשבון</h1>
        </div>

        <div className="grid md:grid-cols-[240px_1fr] gap-6">
          <nav className="space-y-1" aria-label="מקטעי הגדרות">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-start transition-all ${
                    activeSection === section.id
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{section.label}</span>
                </button>
              );
            })}
          </nav>

          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-start transition-all text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 border border-blue-500/20 hover:border-blue-500/40 mt-2"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">פאנל ניהול</span>
            </Link>
          )}

          <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
            {activeSection === "profile" && (
              <SettingsProfileSection
                user={user}
                avatarUrl={avatarUrl}
                avatarFallbackUrl={uiAvatarsFallback(user)}
                displayName={displayName}
                setDisplayName={setDisplayName}
                onSaveDisplayName={handleSaveDisplayName}
                isSavingName={isSavingName}
                historyLength={history.length}
                personalLibraryLength={personalLibrary.length}
                favoritesLength={favorites.length}
                credits={credits}
                isPro={isPro}
              />
            )}
            {activeSection === "stats" && <SettingsStatsSection usageStats={usageStats} />}
            {activeSection === "memory" && <SettingsMemorySection />}
            {activeSection === "referral" && (
              <SettingsReferralSection
                referral={referral}
                referralLoaded={referralLoaded}
                referralCopied={referralCopied}
                onReferralCopied={setReferralCopied}
                redeemCode={redeemCode}
                setRedeemCode={setRedeemCode}
                isRedeeming={isRedeeming}
                setIsRedeeming={setIsRedeeming}
              />
            )}
            {activeSection === "billing" && (
              <SettingsBillingSection
                billingSuccess={billingSuccess}
                isPro={isPro}
                subscription={subscription}
                portalUrl={portalUrl}
              />
            )}
            {activeSection === "data" && (
              <SettingsDataSection
                onExportData={handleExportData}
                isExporting={isExporting}
                onClearHistory={handleClearHistory}
                isClearingHistory={isClearingHistory}
                historyLength={history.length}
              />
            )}
            {activeSection === "danger" && (
              <SettingsDangerSection
                showDeleteConfirm={showDeleteConfirm}
                onShowDeleteConfirm={setShowDeleteConfirm}
                deleteConfirmText={deleteConfirmText}
                setDeleteConfirmText={setDeleteConfirmText}
                onDeleteAccount={handleDeleteAccount}
                isDeleting={isDeleting}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
