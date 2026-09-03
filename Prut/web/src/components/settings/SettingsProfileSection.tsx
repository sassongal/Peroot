/* eslint-disable @next/next/no-img-element */
"use client";

import type { User } from "@supabase/supabase-js";
import { Calendar, Check, Crown, Languages, Loader2, Mail, Moon, Sun, Zap } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { OutputLanguagePicker } from "@/components/features/prompt-improver/OutputLanguagePicker";
import type { OutputLanguage } from "@/lib/output-language";
import { formatDateHe } from "@/lib/dates/format";
import { cn } from "@/lib/utils";
import type { CreditsState } from "./settings-types";

interface SettingsProfileSectionProps {
  user: User;
  avatarUrl: string | undefined;
  /** When OAuth avatar URL fails to load (403, expired Google URL, etc.) */
  avatarFallbackUrl?: string;
  displayName: string;
  setDisplayName: (v: string) => void;
  onSaveDisplayName: () => void;
  isSavingName: boolean;
  credits: CreditsState | null;
  isPro: boolean;
  preferredLanguage: OutputLanguage;
  onPreferredLanguageChange: (next: OutputLanguage) => void;
  isSavingLanguage: boolean;
  onOpenBilling: () => void;
}

/**
 * The profile, rebuilt mobile-first (owner ask, 2026-09-02).
 *
 * Three cards, each one job: who you are (avatar, name, email, plan, since),
 * the language your prompts come out in (the same control as on the home
 * page, saved to the profile), and where the credits stand today with the
 * door to billing. The three counters that used to sit here live in
 * "סטטיסטיקות"; the credit history lives under "מנוי וקרדיטים".
 */
export function SettingsProfileSection({
  user,
  avatarUrl,
  avatarFallbackUrl,
  displayName,
  setDisplayName,
  onSaveDisplayName,
  isSavingName,
  credits,
  isPro,
  preferredLanguage,
  onPreferredLanguageChange,
  isSavingLanguage,
  onOpenBilling,
}: SettingsProfileSectionProps) {
  const { theme, toggleTheme } = useTheme();
  const used = credits ? Math.max(0, credits.dailyLimit - credits.balance) : 0;
  const usedPct = credits && credits.dailyLimit > 0 ? (used / credits.dailyLimit) * 100 : 0;

  return (
    <section
      className="space-y-5 animate-in fade-in duration-300"
      aria-labelledby="settings-profile-heading"
    >
      <header className="space-y-1">
        <h2 id="settings-profile-heading" className="text-xl font-bold">
          פרופיל
        </h2>
        <p className="text-sm text-(--text-muted)">מי אתם, ובאיזו שפה הפרומפטים יוצאים</p>
      </header>

      {/* Identity */}
      <div className="p-4 sm:p-5 bg-(--glass-bg) rounded-2xl border border-(--glass-border) space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-full bg-linear-to-br from-amber-500 to-yellow-600 overflow-hidden border-2 border-(--glass-border)">
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
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (!img.dataset.fallback && avatarFallbackUrl) {
                    img.dataset.fallback = "1";
                    img.src = avatarFallbackUrl;
                  } else {
                    img.onerror = null;
                  }
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-black">
                {user.email?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold",
                  isPro
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                    : "bg-(--surface-panel) text-(--text-muted) border border-(--glass-border)",
                )}
              >
                {isPro ? <Crown className="w-3 h-3" aria-hidden="true" /> : null}
                {isPro ? "Pro" : "חינם"}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-(--text-muted)">
                <Calendar className="w-3 h-3" aria-hidden="true" />
                מאז {formatDateHe(user.created_at)}
              </span>
            </div>
            <p className="text-sm text-(--text-secondary) truncate flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 shrink-0 text-(--text-muted)" aria-hidden="true" />
              <span className="truncate" dir="ltr">
                {user.email}
              </span>
              {user.email_confirmed_at ? (
                <span
                  className="shrink-0 inline-flex items-center gap-0.5 text-[10px] text-emerald-700 dark:text-emerald-300"
                  title="האימייל מאומת"
                >
                  <Check className="w-3 h-3" aria-hidden="true" />
                  מאומת
                </span>
              ) : (
                <span className="shrink-0 text-[10px] text-amber-700 dark:text-amber-300">
                  לא מאומת
                </span>
              )}
            </p>
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-(--text-muted)">שם תצוגה</span>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onBlur={onSaveDisplayName}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              dir="auto"
              placeholder="איך לקרוא לך"
              maxLength={60}
              className="min-w-0 flex-1 bg-(--surface-panel) border border-(--glass-border) focus:border-amber-500/60 rounded-xl px-3 min-h-[44px] text-(--text-primary) font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-colors"
            />
            <button
              type="button"
              onClick={onSaveDisplayName}
              disabled={isSavingName || !displayName.trim()}
              aria-label="שמור שם תצוגה"
              className="cursor-pointer shrink-0 inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-3 rounded-xl border border-(--glass-border) text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--surface-panel) transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingName ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {user.app_metadata?.provider === "google" ? (
            <span className="block text-[11px] text-(--text-muted) mt-1">
              תמונת הפרופיל מגיעה מחשבון Google
            </span>
          ) : null}
        </label>
      </div>

      {/* Output language */}
      <div className="p-4 sm:p-5 bg-(--glass-bg) rounded-2xl border border-(--glass-border) space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-(--text-primary) flex items-center gap-2">
              <Languages className="w-4 h-4 text-amber-500" aria-hidden="true" />
              שפת הפלט המועדפת
            </h3>
            <p className="text-xs text-(--text-muted) mt-1">
              הפרומפט המשודרג נכתב בשפה הזו, בכל מכשיר שבו אתם מחוברים. אפשר לשנות לכל שדרוג בנפרד
              בדף הבית.
            </p>
          </div>
          {isSavingLanguage ? (
            <Loader2
              className="w-4 h-4 animate-spin text-(--text-muted) shrink-0"
              aria-label="שומר"
            />
          ) : null}
        </div>
        <OutputLanguagePicker
          value={preferredLanguage}
          onChange={onPreferredLanguageChange}
          disabled={isSavingLanguage}
          className="max-w-full"
        />
      </div>

      {/* Appearance: the same switch as in the header, where people look for it */}
      <div className="p-4 sm:p-5 bg-(--glass-bg) rounded-2xl border border-(--glass-border) space-y-3">
        <h3 className="font-semibold text-(--text-primary) flex items-center gap-2">
          {theme === "dark" ? (
            <Moon className="w-4 h-4 text-amber-500" aria-hidden="true" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" aria-hidden="true" />
          )}
          מראה
        </h3>
        <div role="radiogroup" aria-label="מראה" className="grid grid-cols-2 gap-2 max-w-xs">
          {(
            [
              { id: "dark", label: "כהה", icon: Moon },
              { id: "light", label: "בהיר", icon: Sun },
            ] as const
          ).map((opt) => {
            const active = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  if (!active) toggleTheme();
                }}
                className={cn(
                  "cursor-pointer inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl border text-sm font-medium transition-colors",
                  active
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                    : "bg-(--surface-panel) text-(--text-secondary) border-(--glass-border) hover:text-(--text-primary)",
                )}
              >
                <opt.icon className="w-4 h-4" aria-hidden="true" />
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-(--text-muted)">
          נשמר בדפדפן הזה. אפשר להחליף גם מהכפתור בכותרת.
        </p>
      </div>

      {/* Credits today */}
      <div
        className={cn(
          "p-4 sm:p-5 rounded-2xl border space-y-3",
          isPro ? "bg-amber-500/5 border-amber-500/20" : "bg-(--glass-bg) border-(--glass-border)",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-(--text-primary) flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" aria-hidden="true" />
            {isPro ? "מנוי Pro" : "קרדיטים להיום"}
          </h3>
          <button
            type="button"
            onClick={onOpenBilling}
            className="cursor-pointer text-xs text-amber-700 dark:text-amber-300 hover:underline min-h-[32px]"
          >
            {isPro ? "ניהול המנוי" : "היסטוריה ושדרוג"}
          </button>
        </div>
        {isPro ? (
          <p className="text-sm text-(--text-secondary)">
            שימוש לפי המכסה החודשית של המנוי, בלי מגבלה יומית.
          </p>
        ) : credits ? (
          <>
            <div
              className="w-full h-2.5 bg-(--glass-border) rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={used}
              aria-valuemin={0}
              aria-valuemax={credits.dailyLimit}
              aria-label={`ניצלת ${used} מתוך ${credits.dailyLimit} להיום`}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  credits.balance === 0
                    ? "bg-red-500"
                    : credits.balance <= 1
                      ? "bg-amber-500"
                      : "bg-emerald-500",
                )}
                style={{ width: `${Math.min(100, usedPct)}%` }}
              />
            </div>
            <p className="text-xs text-(--text-muted)">
              {credits.balance === 0
                ? "נגמרו להיום. המכסה מתחדשת מדי יום."
                : `${credits.balance} מתוך ${credits.dailyLimit} נותרו להיום`}
            </p>
          </>
        ) : (
          <p className="text-xs text-(--text-muted)">טוען...</p>
        )}
      </div>
    </section>
  );
}
