
/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import {
  ArrowRight,
  User as UserIcon,
  Mail,
  Shield,
  Trash2,
  Download,
  History,
  BookOpen,
  Star,
  Loader2,
  Check,
  AlertTriangle,
  ChevronLeft,
  CreditCard,
  Crown,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useHistory } from "@/hooks/useHistory";
import { useLibrary } from "@/hooks/useLibrary";
import { useFavorites } from "@/hooks/useFavorites";
import { useSubscription } from "@/hooks/useSubscription";
import { useSearchParams } from "next/navigation";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const initialSection = searchParams.get("tab") || "profile";
  const billingSuccess = searchParams.get("success") === "true";
  const [activeSection, setActiveSection] = useState<string>(initialSection);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  const supabase = createClient();
  const { history, clearHistory } = useHistory();
  const { personalLibrary } = useLibrary();
  const { favorites } = useFavorites();
  const { subscription, isPro, checkout, loading: subLoading } = useSubscription();
  const [credits, setCredits] = useState<{ balance: number; dailyLimit: number; refreshedAt: string | null } | null>(null);

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const [{ data: profile }, { data: settings }] = await Promise.all([
          supabase
            .from("profiles")
            .select("display_name, credits_balance, credits_refreshed_at")
            .eq("id", user.id)
            .single(),
          supabase
            .from("site_settings")
            .select("daily_free_limit")
            .single(),
        ]);
        setDisplayName(
          profile?.display_name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            ""
        );
        setCredits({
          balance: profile?.credits_balance ?? 0,
          dailyLimit: settings?.daily_free_limit ?? 2,
          refreshedAt: profile?.credits_refreshed_at ?? null,
        });
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
  const avatarUrl =
    metadata.avatar_url ||
    metadata.picture ||
    metadata.avatar ||
    metadata.image ||
    user.identities?.[0]?.identity_data?.avatar_url ||
    user.identities?.[0]?.identity_data?.picture;

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
      const exportData = {
        exportDate: new Date().toISOString(),
        user: {
          email: user.email,
          fullName: metadata.full_name,
          createdAt: user.created_at,
        },
        history: history,
        personalLibrary: personalLibrary,
        favorites: favorites,
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

      toast.success("הנתונים יוצאו בהצלחה");
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

      // Sign out locally after server-side deletion
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
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("השם עודכן בהצלחה");
    } catch {
      toast.error("שגיאה בעדכון השם");
    } finally {
      setIsSavingName(false);
    }
  };

  const sections = [
    { id: "profile", label: "פרופיל", icon: UserIcon },
    { id: "billing", label: "מנוי וחיוב", icon: CreditCard },
    { id: "data", label: "נתונים ופרטיות", icon: Shield },
    { id: "danger", label: "אזור מסוכן", icon: AlertTriangle },
  ];

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[150px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
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
          {/* Sidebar */}
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-right transition-all ${
                    activeSection === section.id
                      ? "bg-purple-600/20 text-purple-400 border border-purple-500/30"
                      : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{section.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
            {/* Profile Section */}
            {activeSection === "profile" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-xl font-bold mb-1">פרופיל</h2>
                  <p className="text-sm text-slate-500">פרטי החשבון שלך</p>
                </div>

                {/* Avatar */}
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 overflow-hidden border-2 border-white/20">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="תמונת פרופיל"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">
                        {user.email?.[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        dir="rtl"
                        placeholder="שם תצוגה"
                        className="bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-lg px-3 py-1.5 text-white font-bold text-base w-full focus:outline-none transition-colors"
                      />
                      <button
                        onClick={handleSaveDisplayName}
                        disabled={isSavingName || !displayName.trim()}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSavingName ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>שמור</span>
                      </button>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">תמונת פרופיל מחשבון Google</p>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    כתובת אימייל
                  </label>
                  <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-white">{user.email}</span>
                    {user.email_confirmed_at ? (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                        מאומת
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full">
                        לא מאומת
                      </span>
                    )}
                  </div>
                </div>

                {/* Account Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
                    <History className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{history.length}</p>
                    <p className="text-xs text-slate-500">היסטוריה</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
                    <BookOpen className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{personalLibrary.length}</p>
                    <p className="text-xs text-slate-500">ספריה אישית</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
                    <Star className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{favorites.length}</p>
                    <p className="text-xs text-slate-500">מועדפים</p>
                  </div>
                </div>

                {/* Credits Status */}
                {credits && !isPro && (
                  <div className="p-5 bg-white/5 rounded-xl border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        מצב קרדיטים
                      </h3>
                      <span className="text-xs text-slate-500">
                        {credits.balance} / {credits.dailyLimit} נותרו היום
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="space-y-2">
                      <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, credits.dailyLimit > 0 ? ((credits.dailyLimit - credits.balance) / credits.dailyLimit) * 100 : 0)}%`,
                            background: credits.balance === 0
                              ? "linear-gradient(90deg, #ef4444, #dc2626)"
                              : credits.balance <= 1
                              ? "linear-gradient(90deg, #f59e0b, #d97706)"
                              : "linear-gradient(90deg, #22c55e, #16a34a)",
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>
                          ניצולת: {credits.dailyLimit > 0 ? Math.round(((credits.dailyLimit - credits.balance) / credits.dailyLimit) * 100) : 0}%
                        </span>
                        <span>
                          {credits.balance === 0 ? "נגמרו הקרדיטים להיום" : `${credits.balance} שימושים נותרו`}
                        </span>
                      </div>
                    </div>
                    {credits.balance === 0 && (
                      <div className="flex items-center justify-between gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <p className="text-xs text-amber-300">הקרדיטים מתחדשים מדי יום. רוצה ללא הגבלה?</p>
                        <Link
                          href="/pricing"
                          className="shrink-0 px-3 py-1.5 rounded-lg accent-gradient text-black text-xs font-bold"
                        >
                          שדרג ל-Pro
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {credits && isPro && (
                  <div className="p-5 bg-amber-500/5 rounded-xl border border-amber-500/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-400" />
                      <h3 className="font-semibold text-amber-300">מצב קרדיטים</h3>
                    </div>
                    <p className="text-sm text-slate-300">שימוש ללא הגבלה — אין מגבלת קרדיטים במנוי Pro</p>
                  </div>
                )}

                {/* Account Created */}
                <div className="text-sm text-slate-500 pt-4 border-t border-white/10">
                  חשבון נוצר בתאריך:{" "}
                  {new Date(user.created_at).toLocaleDateString("he-IL", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
            )}

            {/* Billing Section */}
            {activeSection === "billing" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-xl font-bold mb-1">מנוי וחיוב</h2>
                  <p className="text-sm text-slate-500">נהל את המנוי והתשלום שלך</p>
                </div>

                {billingSuccess && (
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400 shrink-0" />
                    <span className="text-sm text-green-300">תודה שהצטרפת ל-Peroot Pro! ייתכן שהשינוי ייכנס לתוקף תוך מספר דקות.</span>
                  </div>
                )}

                {/* Current Plan */}
                <div className="p-5 bg-white/5 rounded-xl border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isPro ? (
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <Crown className="w-5 h-5 text-amber-400" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-white">
                          {isPro ? "Peroot Pro" : "תוכנית חינם"}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {isPro
                            ? `סטטוס: פעיל${subscription.renews_at ? ` · מתחדש ב-${new Date(subscription.renews_at).toLocaleDateString("he-IL")}` : ""}`
                            : "3 פרומפטים ביום"}
                        </p>
                      </div>
                    </div>
                    {isPro && (
                      <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full border border-amber-500/30">
                        PRO
                      </span>
                    )}
                  </div>

                  {!isPro && (
                    <Link
                      href="/pricing"
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl accent-gradient text-black font-bold text-sm hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all"
                    >
                      <Crown className="w-4 h-4" />
                      <span>שדרג ל-Pro — ₪3.99/חודש</span>
                    </Link>
                  )}

                  {isPro && (
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <a
                        href={
                          subscription.lemonsqueezy_subscription_id
                            ? `https://app.lemonsqueezy.com/my-orders`
                            : "https://app.lemonsqueezy.com/my-orders"
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium rounded-xl transition-colors text-sm border border-amber-500/20"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>ניהול מנוי</span>
                      </a>
                      <a
                        href="https://app.lemonsqueezy.com/my-orders"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded-xl transition-colors text-sm border border-red-500/20"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>ביטול מנוי</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Pro Benefits */}
                {!isPro && (
                  <div className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3">
                    <h3 className="font-semibold text-amber-400 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      מה כולל Pro?
                    </h3>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        פרומפטים ללא הגבלה
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        גישה לכל המנועים
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        שיפור איטרטיבי מתקדם
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        שמירה לספריה אישית ללא הגבלה
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        תמיכה בעדיפות
                      </li>
                    </ul>
                  </div>
                )}

                {/* Subscription end notice (Pro — cancelled) */}
                {isPro && subscription.ends_at && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-300">
                      המנוי שלך בוטל ויסתיים ב-{new Date(subscription.ends_at).toLocaleDateString("he-IL")}. לאחר מכן תעבור לתוכנית החינם.
                    </p>
                  </div>
                )}

                {/* Cancel warning for active Pro users */}
                {isPro && !subscription.ends_at && (
                  <p className="text-xs text-slate-500 text-center">
                    לביטול המנוי לחץ על &quot;ביטול מנוי&quot; למעלה. הגישה ל-Pro תישמר עד סוף תקופת החיוב הנוכחית.
                  </p>
                )}

                {/* Upgrade CTA for free users */}
                {!isPro && (
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">רוצה פרומפטים ללא הגבלה?</p>
                      <p className="text-xs text-slate-500 mt-0.5">שדרג ל-Pro ב-₪3.99 בלבד לחודש</p>
                    </div>
                    <Link
                      href="/pricing"
                      className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl accent-gradient text-black font-bold text-sm hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>שדרג ל-Pro</span>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Data & Privacy Section */}
            {activeSection === "data" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-xl font-bold mb-1">נתונים ופרטיות</h2>
                  <p className="text-sm text-slate-500">נהל את הנתונים שלך</p>
                </div>

                {/* Export Data */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                  <div className="flex items-start gap-3">
                    <Download className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold">ייצוא נתונים</h3>
                      <p className="text-sm text-slate-500">
                        הורד את כל הנתונים שלך כקובץ JSON - כולל היסטוריה, ספריה אישית ומועדפים
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleExportData}
                    disabled={isExporting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-medium rounded-xl transition-colors disabled:opacity-50"
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>הורד את הנתונים שלי</span>
                  </button>
                </div>

                {/* Clear History */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                  <div className="flex items-start gap-3">
                    <History className="w-5 h-5 text-orange-400 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold">מחיקת היסטוריה</h3>
                      <p className="text-sm text-slate-500">
                        מחק את כל היסטוריית השיפורים שלך ({history.length} פריטים)
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClearHistory}
                    disabled={isClearingHistory || history.length === 0}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 font-medium rounded-xl transition-colors disabled:opacity-50"
                  >
                    {isClearingHistory ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    <span>מחק היסטוריה</span>
                  </button>
                </div>

              </div>
            )}

            {/* Danger Zone Section */}
            {activeSection === "danger" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-xl font-bold text-red-400 mb-1">אזור מסוכן</h2>
                  <p className="text-sm text-slate-500">פעולות שלא ניתן לבטל</p>
                </div>

                {/* Delete Account */}
                <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-400">מחיקת חשבון</h3>
                      <p className="text-sm text-slate-400">
                        מחיקת החשבון תסיר לצמיתות את כל הנתונים שלך כולל היסטוריה, ספריה אישית
                        ומועדפים. פעולה זו לא ניתנת לביטול.
                      </p>
                    </div>
                  </div>

                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>מחק את החשבון שלי</span>
                    </button>
                  ) : (
                    <div className="space-y-3 p-4 bg-black/30 rounded-xl">
                      <p className="text-sm text-slate-300">
                        כדי לאשר, הקלד <strong className="text-red-400">מחק את החשבון</strong>
                      </p>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="הקלד כאן..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/50"
                        dir="rtl"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteConfirmText("");
                          }}
                          className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-medium rounded-xl transition-colors"
                        >
                          ביטול
                        </button>
                        <button
                          onClick={handleDeleteAccount}
                          disabled={isDeleting || deleteConfirmText !== "מחק את החשבון"}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          <span>מחק לצמיתות</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
