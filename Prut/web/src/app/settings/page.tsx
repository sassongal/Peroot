"use client";

import {
  OUTPUT_LANGUAGE_STORAGE_KEY,
  isOutputLanguage,
  outputLanguageDef,
  type OutputLanguage,
} from "@/lib/output-language";
import { trackOutputLanguageSelected } from "@/lib/analytics";
import { logger } from "@/lib/logger";
import { useState, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  User as UserIcon,
  Shield,
  Loader2,
  ChevronRight,
  BarChart3,
  CreditCard,
  Gift,
  Plug,
  LayoutDashboard,
  Brain,
  Fingerprint,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useHistory } from "@/hooks/useHistory";
import { useLibrary } from "@/hooks/useLibrary";
import { useFavorites } from "@/hooks/useFavorites";
import { useSubscription } from "@/hooks/useSubscription";
import { useRouter, useSearchParams } from "next/navigation";
import type { ActivityLogRow, UsageStatsState } from "@/components/settings/settings-types";
import { SettingsProfileSection } from "@/components/settings/SettingsProfileSection";
import { SettingsStatsSection } from "@/components/settings/SettingsStatsSection";
import { SettingsReferralSection } from "@/components/settings/SettingsReferralSection";
import { SettingsBillingSection } from "@/components/settings/SettingsBillingSection";
import { SettingsDataSection } from "@/components/settings/SettingsDataSection";
import { SettingsMemorySection } from "@/components/settings/SettingsMemorySection";
import { SettingsStyleSection } from "@/components/settings/SettingsStyleSection";
import { SettingsConnectSection } from "@/components/settings/SettingsConnectSection";
import { CreditsPanel } from "@/components/settings/CreditsPanel";
import { resolveAvatarUrl, avatarFallbackUrl as uiAvatarsFallback } from "@/lib/user-avatar";
import { QUOTA_FALLBACK, resolveDailyLimit } from "@/lib/quota-policy";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  // "credits" and "danger" used to be their own tabs; they live under billing
  // and data now, and old links (quota modal, emails) still land in the right place.
  const resolveTab = (tab: string | null) =>
    tab === "credits" ? "billing" : tab === "danger" ? "data" : tab || "profile";
  const initialSection = resolveTab(searchParams.get("tab"));
  const billingSuccessParam = searchParams.get("success") === "true";
  const [activeSection, setActiveSection] = useState<string>(initialSection);

  // Keep the section in the URL (shareable, refresh-safe) and follow the URL
  // when it changes (back/forward, external links into a specific tab).
  useEffect(() => {
    setActiveSection(resolveTab(searchParams.get("tab")));
  }, [searchParams]);
  const selectSection = (id: string) => {
    setActiveSection(id);
    router.replace(id === "profile" ? "/settings" : `/settings?tab=${id}`, { scroll: false });
  };
  const [isAdmin, setIsAdmin] = useState(false);
  // The user's preferred output language: shown and edited in the profile,
  // and the language the referral invitation is written in.
  const [preferredLanguage, setPreferredLanguage] = useState<OutputLanguage>("hebrew");
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  // Last name persisted to the DB — lets blur-autosave skip no-op writes.
  const savedNameRef = useRef("");
  // The phone strip scrolls; a deep link into a far tab must show it selected.
  const activeTabRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [activeSection]);

  const supabase = useMemo(() => createClient(), []);

  const handlePreferredLanguage = async (next: OutputLanguage) => {
    if (!user || next === preferredLanguage) return;
    const previous = preferredLanguage;
    setPreferredLanguage(next);
    setIsSavingLanguage(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ preferred_output_language: next })
        .eq("id", user.id);
      if (error) throw error;
      try {
        localStorage.setItem(OUTPUT_LANGUAGE_STORAGE_KEY, next);
      } catch {
        /* private mode */
      }
      trackOutputLanguageSelected(next, "picker");
      toast.success(`שפת הפלט המועדפת: ${outputLanguageDef(next).he}`);
    } catch (err) {
      logger.error("[settings] preferred language save failed", err);
      setPreferredLanguage(previous);
      toast.error("שמירת השפה נכשלה, נסו שוב");
    } finally {
      setIsSavingLanguage(false);
    }
  };
  const { history, clearHistory } = useHistory();
  const { personalLibrary } = useLibrary();
  const { favorites } = useFavorites();
  const { subscription, isPro } = useSubscription();
  // Only celebrate once the subscription actually reports Pro - visiting
  // /settings?success=true shouldn't fake a thank-you without a real purchase.
  const billingSuccess = billingSuccessParam && isPro;
  const [credits, setCredits] = useState<{
    balance: number;
    dailyLimit: number;
    refreshedAt: string | null;
  } | null>(null);
  const [referral, setReferral] = useState<{
    code: string;
    uses: number;
    maxUses: number;
    totalReferrals: number;
    activeReferrals: number;
    bonusPerReferral: number;
    bonusDays: number;
    grantOn: "activation" | "signup";
    bonusCredits: number;
    bonusExpiresAt: string | null;
  } | null>(null);
  const [referralLoaded, setReferralLoaded] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [usageStats, setUsageStats] = useState<UsageStatsState | null>(null);

  useEffect(() => {
    async function getUser() {
      try {
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
            supabase
              .from("profiles")
              .select(
                "display_name, credits_balance, credits_refreshed_at, preferred_output_language",
              )
              .eq("id", user.id)
              .single(),
            supabase.from("site_settings").select("daily_free_limit").single(),
          ]);
          const loadedName =
            profile?.display_name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "";
          setDisplayName(loadedName);
          savedNameRef.current = loadedName.trim();
          const lang = profile?.preferred_output_language;
          if (isOutputLanguage(lang)) setPreferredLanguage(lang);
          setCredits({
            balance: profile?.credits_balance ?? 0,
            dailyLimit: resolveDailyLimit(settings?.daily_free_limit, QUOTA_FALLBACK.freeDaily),
            refreshedAt: profile?.credits_refreshed_at ?? null,
          });

          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

          const [
            { count: totalCount },
            { count: monthCount },
            { count: weekCount },
            { data: recentActivity },
          ] = await Promise.all([
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

          (recentActivity || []).forEach(
            (log: { created_at: string; details: { mode?: string } | null }) => {
              const mode = log.details?.mode || "standard";
              catCounts[mode] = (catCounts[mode] || 0) + 1;
              const day = log.created_at.slice(0, 10);
              dayCounts[day] = (dayCounts[day] || 0) + 1;
            },
          );

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
      } catch (err) {
        console.error("Settings load failed:", err);
        toast.error("טעינת ההגדרות נכשלה. נסו לרענן את הדף.");
      } finally {
        setLoading(false);
      }
    }
    getUser();
  }, [supabase]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-(--text-muted) mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">נדרשת התחברות</h1>
          <p className="text-muted-foreground">עליך להתחבר כדי לגשת להגדרות החשבון</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-colors"
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

      // Achievements were exported as a hardcoded [] while the rows existed in
      // user_achievements, so a data-export request returned less than the
      // account actually holds. Read them through the user's own client, which
      // RLS already scopes to this account.
      const { data: achievementRows } = await supabase
        .from("user_achievements")
        .select("achievement_id, unlocked_at")
        .eq("user_id", user.id);

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
        achievements: achievementRows ?? [],
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body?.code === "email_mismatch") {
          toast.error("האימייל שהזנת אינו תואם לחשבון");
          setIsDeleting(false);
          return;
        }
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
    // Autosave-on-blur guard: don't re-save (or toast) an unchanged name.
    if (displayName.trim() === savedNameRef.current) return;
    setIsSavingName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() })
        .eq("id", user.id);
      if (error) throw error;
      savedNameRef.current = displayName.trim();
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

  // Eight sections in four groups. The desktop rail shows the group names;
  // the phone strip shows the same eight in the same order.
  const groups = [
    {
      label: "החשבון",
      items: [
        { id: "profile", label: "פרופיל", icon: UserIcon },
        { id: "billing", label: "מנוי וקרדיטים", icon: CreditCard },
        { id: "stats", label: "סטטיסטיקות", icon: BarChart3 },
      ],
    },
    {
      label: "התאמה אישית",
      items: [
        { id: "memory", label: "זיכרון AI", icon: Brain },
        { id: "style", label: "הסגנון שלך", icon: Fingerprint },
      ],
    },
    {
      label: "חיבורים",
      items: [
        { id: "connect", label: "Peroot Connect", icon: Plug },
        { id: "referral", label: "הזמנת חברים", icon: Gift },
      ],
    },
    {
      label: "נתונים",
      items: [{ id: "data", label: "נתונים ופרטיות", icon: Shield }],
    },
  ];
  const sections = groups.flatMap((g) => g.items);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-500/10 dark:bg-amber-900/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-sky-500/10 dark:bg-blue-900/10 blur-[150px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            type="button"
            onClick={() => {
              // Direct entries (bookmark, shared link) have no in-app history;
              // falling "back" would leave the site. Home is the safe target.
              if (window.history.length <= 1) router.push("/");
              else router.back();
            }}
            className="cursor-pointer flex items-center gap-2 min-h-[44px] text-(--text-muted) hover:text-(--text-primary) transition-colors group"
            aria-label="חזרה"
          >
            <ChevronRight
              className="w-5 h-5 group-hover:translate-x-1 transition-transform motion-reduce:transition-none"
              aria-hidden="true"
            />
            <span>חזרה</span>
          </button>
          <div className="h-6 w-px bg-(--glass-border)" />
          <h1 className="text-2xl font-bold">הגדרות חשבון</h1>
        </div>

        {/* Mobile horizontal scroll nav */}
        <nav
          className="flex md:hidden gap-1 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none"
          aria-label="מקטעי הגדרות"
        >
          {sections.map((section) => {
            const Icon = section.icon;
            const active = activeSection === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => selectSection(section.id)}
                ref={active ? activeTabRef : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "cursor-pointer shrink-0 flex items-center gap-2 px-3 min-h-[40px] rounded-xl text-sm font-medium transition-colors whitespace-nowrap border",
                  active
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                    : "text-(--text-muted) hover:bg-(--glass-bg) hover:text-(--text-primary) border-transparent",
                )}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span>{section.label}</span>
              </button>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              className="cursor-pointer shrink-0 flex items-center gap-2 px-3 min-h-[40px] rounded-xl text-sm font-medium transition-colors text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 whitespace-nowrap"
            >
              <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
              <span>לוח ניהול</span>
            </Link>
          )}
        </nav>

        <div className="grid md:grid-cols-[240px_1fr] gap-6 mt-4 md:mt-0">
          {/* Desktop sidebar */}
          <div className="hidden md:flex flex-col gap-1 self-start md:sticky md:top-24">
            <nav className="space-y-4" aria-label="מקטעי הגדרות">
              {groups.map((group) => (
                <div key={group.label} className="space-y-1">
                  <p className="px-4 text-[11px] font-medium text-(--text-muted)">{group.label}</p>
                  {group.items.map((section) => {
                    const Icon = section.icon;
                    const active = activeSection === section.id;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => selectSection(section.id)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "cursor-pointer w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-start transition-colors border",
                          active
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                            : "text-(--text-muted) hover:bg-(--glass-bg) hover:text-(--text-primary) border-transparent",
                        )}
                      >
                        <Icon className="w-5 h-5" aria-hidden="true" />
                        <span className="font-medium">{section.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>

            {isAdmin && (
              <Link
                href="/admin"
                className="cursor-pointer flex items-center gap-3 px-4 py-2.5 rounded-xl text-start transition-colors text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 mt-3"
              >
                <LayoutDashboard className="w-5 h-5" aria-hidden="true" />
                <span className="font-medium">לוח ניהול</span>
              </Link>
            )}
          </div>

          <div className="bg-(--glass-bg) border border-(--glass-border) rounded-2xl p-4 sm:p-6 min-w-0">
            {activeSection === "profile" && (
              <SettingsProfileSection
                user={user}
                avatarUrl={avatarUrl}
                avatarFallbackUrl={uiAvatarsFallback(user)}
                displayName={displayName}
                setDisplayName={setDisplayName}
                onSaveDisplayName={handleSaveDisplayName}
                isSavingName={isSavingName}
                credits={credits}
                isPro={isPro}
                preferredLanguage={preferredLanguage}
                onPreferredLanguageChange={handlePreferredLanguage}
                isSavingLanguage={isSavingLanguage}
                onOpenBilling={() => selectSection("billing")}
              />
            )}
            {activeSection === "stats" && <SettingsStatsSection usageStats={usageStats} />}
            {activeSection === "memory" && <SettingsMemorySection />}
            {activeSection === "style" && <SettingsStyleSection />}
            {activeSection === "connect" && <SettingsConnectSection />}
            {activeSection === "referral" && (
              <SettingsReferralSection
                referral={referral}
                language={preferredLanguage}
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
              <div className="space-y-10">
                <SettingsBillingSection
                  billingSuccess={billingSuccess}
                  isPro={isPro}
                  subscription={subscription}
                  portalUrl={portalUrl}
                />
                <CreditsPanel />
              </div>
            )}
            {activeSection === "data" && (
              <SettingsDataSection
                onExportData={handleExportData}
                isExporting={isExporting}
                onClearHistory={handleClearHistory}
                isClearingHistory={isClearingHistory}
                historyLength={history.length}
                showDeleteConfirm={showDeleteConfirm}
                onShowDeleteConfirm={setShowDeleteConfirm}
                deleteConfirmText={deleteConfirmText}
                setDeleteConfirmText={setDeleteConfirmText}
                confirmEmail={confirmEmail}
                setConfirmEmail={setConfirmEmail}
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
