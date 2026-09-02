"use client";

import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

interface SettingsDangerSectionProps {
  showDeleteConfirm: boolean;
  onShowDeleteConfirm: (v: boolean) => void;
  deleteConfirmText: string;
  setDeleteConfirmText: (v: string) => void;
  confirmEmail: string;
  setConfirmEmail: (v: string) => void;
  onDeleteAccount: () => void;
  isDeleting: boolean;
}

export function SettingsDangerSection({
  showDeleteConfirm,
  onShowDeleteConfirm,
  deleteConfirmText,
  setDeleteConfirmText,
  confirmEmail,
  setConfirmEmail,
  onDeleteAccount,
  isDeleting,
}: SettingsDangerSectionProps) {
  return (
    <section
      className="space-y-6 animate-in fade-in duration-300"
      aria-labelledby="settings-danger-heading"
    >
      <header className="space-y-1">
        <h2 id="settings-danger-heading" className="text-xl font-bold text-red-400">
          אזור מסוכן
        </h2>
        <p className="text-sm text-(--text-muted)">פעולות שלא ניתן לבטל</p>
      </header>

      <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-400">מחיקת חשבון</h3>
            <p className="text-sm text-(--text-muted)">
              מחיקת החשבון תסיר לצמיתות את כל הנתונים שלך כולל היסטוריה, ספרייה אישית ומועדפים.
              פעולה זו לא ניתנת לביטול.
            </p>
          </div>
        </div>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => onShowDeleteConfirm(true)}
            className="cursor-pointer w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium rounded-xl transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>מחק את החשבון שלי</span>
          </button>
        ) : (
          <div className="space-y-3 p-4 bg-(--glass-bg) rounded-xl">
            <p className="text-sm text-(--text-secondary)">הזן את כתובת האימייל שלך לאישור</p>
            <input
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-(--glass-bg) border border-(--glass-border) rounded-xl py-2.5 px-4 text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:border-red-500/50 transition-colors"
              dir="ltr"
            />
            <p className="text-sm text-(--text-secondary)">
              כדי לאשר, הקלד <strong className="text-red-400">מחק את החשבון</strong>
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="הקלד כאן..."
              className="w-full bg-(--glass-bg) border border-(--glass-border) rounded-xl py-2.5 px-4 text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:border-red-500/50 transition-colors"
              dir="rtl"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                  setConfirmEmail("");
                }}
                className="cursor-pointer flex-1 px-4 py-2.5 bg-(--glass-bg) hover:bg-(--glass-bg) text-(--text-secondary) font-medium rounded-xl transition-colors"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={onDeleteAccount}
                disabled={isDeleting || deleteConfirmText !== "מחק את החשבון" || !confirmEmail}
                className="cursor-pointer flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    </section>
  );
}
