
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
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useHistory } from "@/hooks/useHistory";
import { useLibrary } from "@/hooks/useLibrary";
import { useFavorites } from "@/hooks/useFavorites";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>("profile");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);

  const supabase = createClient();
  const { history, clearHistory } = useHistory();
  const { personalLibrary } = useLibrary();
  const { favorites } = useFavorites();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
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
      // Delete user data from all tables
      await Promise.all([
        supabase.from("history").delete().eq("user_id", user.id),
        supabase.from("personal_library").delete().eq("user_id", user.id),
        supabase.from("prompt_favorites").delete().eq("user_id", user.id),
      ]);

      // Sign out
      await supabase.auth.signOut();

      toast.success("החשבון נמחק בהצלחה");
      window.location.href = "/";
    } catch {
      toast.error("שגיאה במחיקת החשבון");
      setIsDeleting(false);
    }
  };

  const sections = [
    { id: "profile", label: "פרופיל", icon: UserIcon },
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
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 overflow-hidden border-2 border-white/20">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">
                        {user.email?.[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-lg">
                      {metadata.full_name || user.email?.split("@")[0]}
                    </p>
                    <p className="text-sm text-slate-500">תמונת פרופיל מחשבון Google</p>
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
