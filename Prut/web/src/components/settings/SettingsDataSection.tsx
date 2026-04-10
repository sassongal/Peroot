"use client";

import { Download, History, Loader2, Trash2 } from "lucide-react";

interface SettingsDataSectionProps {
  onExportData: () => void;
  isExporting: boolean;
  onClearHistory: () => void;
  isClearingHistory: boolean;
  historyLength: number;
}

export function SettingsDataSection({
  onExportData,
  isExporting,
  onClearHistory,
  isClearingHistory,
  historyLength,
}: SettingsDataSectionProps) {
  return (
    <section className="space-y-6 animate-in fade-in duration-300" aria-labelledby="settings-data-heading">
      <header className="space-y-1">
        <h2 id="settings-data-heading" className="text-xl font-bold">
          נתונים ופרטיות
        </h2>
        <p className="text-sm text-slate-500">נהל את הנתונים שלך</p>
      </header>

      <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
        <div className="flex items-start gap-3">
          <Download className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold">ייצוא נתונים</h3>
            <p className="text-sm text-slate-500">
              הורד את כל הנתונים שלך כקובץ JSON - כולל פרופיל, היסטוריה, ספריה, מועדפים, סטטיסטיקות ויומן פעילות
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onExportData}
          disabled={isExporting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span>הורד את הנתונים שלי</span>
        </button>
      </div>

      <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
        <div className="flex items-start gap-3">
          <History className="w-5 h-5 text-orange-400 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold">מחיקת היסטוריה</h3>
            <p className="text-sm text-slate-500">מחק את כל היסטוריית השיפורים שלך ({historyLength} פריטים)</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClearHistory}
          disabled={isClearingHistory || historyLength === 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          {isClearingHistory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          <span>מחק היסטוריה</span>
        </button>
      </div>
    </section>
  );
}
