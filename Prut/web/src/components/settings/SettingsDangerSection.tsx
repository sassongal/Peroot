"use client";

import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

interface SettingsDangerSectionProps {
  showDeleteConfirm: boolean;
  onShowDeleteConfirm: (v: boolean) => void;
  deleteConfirmText: string;
  setDeleteConfirmText: (v: string) => void;
  onDeleteAccount: () => void;
  isDeleting: boolean;
}

export function SettingsDangerSection({
  showDeleteConfirm,
  onShowDeleteConfirm,
  deleteConfirmText,
  setDeleteConfirmText,
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
        <p className="text-sm text-slate-400">פעולות שלא ניתן לבטל</p>
      </header>

      <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-400">מחיקת חשבון</h3>
            <p className="text-sm text-slate-400">
              מחיקת החשבון תסיר לצמיתות את כל הנתונים שלך כולל היסטוריה, ספריה אישית ומועדפים. פעולה
              זו לא ניתנת לביטול.
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
          <div className="space-y-3 p-4 bg-black/30 rounded-xl">
            <p className="text-sm text-slate-300">
              כדי לאשר, הקלד <strong className="text-red-400">מחק את החשבון</strong>
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="הקלד כאן..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500/50 transition-colors"
              dir="rtl"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                }}
                className="cursor-pointer flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-medium rounded-xl transition-colors"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={onDeleteAccount}
                disabled={isDeleting || deleteConfirmText !== "מחק את החשבון"}
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
