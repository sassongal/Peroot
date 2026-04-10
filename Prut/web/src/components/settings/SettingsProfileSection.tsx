/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import {
  BookOpen,
  Check,
  Crown,
  History,
  Loader2,
  Mail,
  Star,
  Zap,
} from "lucide-react";
import type { CreditsState } from "./settings-types";

interface SettingsProfileSectionProps {
  user: User;
  avatarUrl: string | undefined;
  displayName: string;
  setDisplayName: (v: string) => void;
  onSaveDisplayName: () => void;
  isSavingName: boolean;
  historyLength: number;
  personalLibraryLength: number;
  favoritesLength: number;
  credits: CreditsState | null;
  isPro: boolean;
}

export function SettingsProfileSection({
  user,
  avatarUrl,
  displayName,
  setDisplayName,
  onSaveDisplayName,
  isSavingName,
  historyLength,
  personalLibraryLength,
  favoritesLength,
  credits,
  isPro,
}: SettingsProfileSectionProps) {
  return (
    <section className="space-y-6 animate-in fade-in duration-300" aria-labelledby="settings-profile-heading">
      <header className="space-y-1">
        <h2 id="settings-profile-heading" className="text-xl font-bold">
          פרופיל
        </h2>
        <p className="text-sm text-slate-500">פרטי החשבון שלך</p>
      </header>

      <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 overflow-hidden border-2 border-white/20">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="תמונת פרופיל"
              width={64}
              height={64}
              loading="lazy"
              decoding="async"
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
              className="bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-lg px-3 py-2.5 text-white font-bold text-base w-full focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={onSaveDisplayName}
              disabled={isSavingName || !displayName.trim()}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>שמור</span>
            </button>
          </div>
          <p className="text-sm text-slate-500 mt-1">תמונת פרופיל מחשבון Google</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
          <Mail className="w-4 h-4" />
          כתובת אימייל
        </label>
        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
          <span className="text-white">{user.email}</span>
          {user.email_confirmed_at ? (
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">מאומת</span>
          ) : (
            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full">לא מאומת</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
          <History className="w-5 h-5 text-amber-400 mx-auto mb-2" />
          <p className="text-2xl font-bold">{historyLength}</p>
          <p className="text-xs text-slate-400">היסטוריה</p>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
          <BookOpen className="w-5 h-5 text-blue-400 mx-auto mb-2" />
          <p className="text-2xl font-bold">{personalLibraryLength}</p>
          <p className="text-xs text-slate-400">ספריה אישית</p>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
          <Star className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
          <p className="text-2xl font-bold">{favoritesLength}</p>
          <p className="text-xs text-slate-400">מועדפים</p>
        </div>
      </div>

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
          <div className="space-y-2">
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, credits.dailyLimit > 0 ? ((credits.dailyLimit - credits.balance) / credits.dailyLimit) * 100 : 0)}%`,
                  background:
                    credits.balance === 0
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
              <Link href="/pricing" className="shrink-0 px-3 py-1.5 rounded-lg accent-gradient text-black text-xs font-bold">
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
          <p className="text-sm text-slate-300">שימוש ללא הגבלה - אין מגבלת קרדיטים במנוי Pro</p>
        </div>
      )}

      <div className="text-sm text-slate-500 pt-4 border-t border-white/10">
        חשבון נוצר בתאריך:{" "}
        {new Date(user.created_at).toLocaleDateString("he-IL", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </div>
    </section>
  );
}
