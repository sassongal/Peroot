"use client";

import { AlertTriangle, Download, History, Loader2, Trash2 } from "lucide-react";

interface SettingsDataSectionProps {
  onExportData: () => void;
  isExporting: boolean;
  onClearHistory: () => void;
  isClearingHistory: boolean;
  historyLength: number;
  /** Account deletion, formerly its own "אזור מסוכן" tab. */
  showDeleteConfirm: boolean;
  onShowDeleteConfirm: (v: boolean) => void;
  deleteConfirmText: string;
  setDeleteConfirmText: (v: string) => void;
  confirmEmail: string;
  setConfirmEmail: (v: string) => void;
  onDeleteAccount: () => void;
  isDeleting: boolean;
}

const DELETE_PHRASE = "מחק את החשבון";

/**
 * Everything about the user's data in one place: take it with you, clear
 * the history, or delete the account. The delete block used to be a
 * separate "אזור מסוכן" tab; a ninth tab for one button was one too many,
 * and a person looking for "delete my data" looks under data, not danger.
 */
export function SettingsDataSection({
  onExportData,
  isExporting,
  onClearHistory,
  isClearingHistory,
  historyLength,
  showDeleteConfirm,
  onShowDeleteConfirm,
  deleteConfirmText,
  setDeleteConfirmText,
  confirmEmail,
  setConfirmEmail,
  onDeleteAccount,
  isDeleting,
}: SettingsDataSectionProps) {
  const historyLine =
    historyLength === 0
      ? "ההיסטוריה ריקה"
      : historyLength === 1
        ? "מחיקת השיפור היחיד בהיסטוריה"
        : `מחיקת כל ${historyLength} השיפורים בהיסטוריה`;

  return (
    <section
      className="space-y-6 animate-in fade-in duration-300"
      aria-labelledby="settings-data-heading"
    >
      <header className="space-y-1">
        <h2 id="settings-data-heading" className="text-xl font-bold">
          נתונים ופרטיות
        </h2>
        <p className="text-sm text-(--text-muted)">
          הנתונים שלכם הם שלכם: אפשר להוריד אותם, לנקות, או למחוק את החשבון
        </p>
      </header>

      <div className="p-4 sm:p-5 bg-(--glass-bg) rounded-2xl border border-(--glass-border) space-y-3">
        <div className="flex items-start gap-3">
          <Download className="w-5 h-5 text-(--text-muted) mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-(--text-primary)">ייצוא הנתונים</h3>
            <p className="text-sm text-(--text-muted)">
              קובץ JSON אחד עם הפרופיל, ההיסטוריה, הספרייה, המועדפים, הסטטיסטיקות ויומן הפעילות.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onExportData}
          disabled={isExporting}
          className="cursor-pointer w-full flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-(--glass-border) bg-(--surface-panel) text-(--text-primary) font-medium text-sm hover:border-amber-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="w-4 h-4" aria-hidden="true" />
          )}
          <span>הורדת הנתונים שלי</span>
        </button>
      </div>

      <div className="p-4 sm:p-5 bg-(--glass-bg) rounded-2xl border border-(--glass-border) space-y-3">
        <div className="flex items-start gap-3">
          <History className="w-5 h-5 text-(--text-muted) mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-(--text-primary)">ניקוי ההיסטוריה</h3>
            <p className="text-sm text-(--text-muted)">
              {historyLine}. הספרייה האישית והמועדפים נשארים.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClearHistory}
          disabled={isClearingHistory || historyLength === 0}
          className="cursor-pointer w-full flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-(--glass-border) bg-(--surface-panel) text-(--text-primary) font-medium text-sm hover:border-amber-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isClearingHistory ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          )}
          <span>מחיקת ההיסטוריה</span>
        </button>
      </div>

      <div
        className="p-4 sm:p-5 bg-red-500/5 rounded-2xl border border-red-500/20 space-y-4"
        aria-labelledby="settings-delete-heading"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <h3
              id="settings-delete-heading"
              className="font-semibold text-red-700 dark:text-red-300"
            >
              מחיקת החשבון
            </h3>
            <p className="text-sm text-(--text-muted)">
              מוחקת לצמיתות את ההיסטוריה, הספרייה האישית, המועדפים והזיכרון. אין דרך חזרה, ולכן כדאי
              להוריד את הנתונים קודם.
            </p>
          </div>
        </div>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => onShowDeleteConfirm(true)}
            className="cursor-pointer w-full flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-red-500/30 text-red-700 dark:text-red-300 font-medium text-sm hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            <span>מחיקת החשבון שלי</span>
          </button>
        ) : (
          <div className="space-y-3 p-4 bg-(--surface-panel) rounded-xl border border-(--glass-border)">
            <label className="block space-y-1">
              <span className="text-sm text-(--text-secondary)">
                כתובת האימייל של החשבון, לאישור
              </span>
              <input
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="off"
                className="w-full bg-(--glass-bg) border border-(--glass-border) rounded-xl min-h-[44px] px-4 text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 transition-colors"
                dir="ltr"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-(--text-secondary)">
                הקלידו <strong className="text-red-700 dark:text-red-300">{DELETE_PHRASE}</strong>
              </span>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={DELETE_PHRASE}
                autoComplete="off"
                className="w-full bg-(--glass-bg) border border-(--glass-border) rounded-xl min-h-[44px] px-4 text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 transition-colors"
                dir="rtl"
              />
            </label>
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  onShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                  setConfirmEmail("");
                }}
                className="cursor-pointer flex-1 min-h-[44px] px-4 rounded-xl border border-(--glass-border) text-(--text-secondary) font-medium hover:bg-(--glass-bg) transition-colors"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={onDeleteAccount}
                disabled={isDeleting || deleteConfirmText !== DELETE_PHRASE || !confirmEmail}
                className="cursor-pointer flex-1 flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                )}
                <span>מחיקה לצמיתות</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
