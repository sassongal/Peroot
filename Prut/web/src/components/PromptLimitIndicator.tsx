"use client";

import { useSiteSettings } from "@/hooks/useSiteSettings";
import { usePromptLimits } from "@/hooks/usePromptLimits";
import { useState } from "react";
import { LogIn, Sparkles } from "lucide-react";

export function PromptLimitIndicator() {
  const { remainingPrompts, totalAllowed, isGuest, settings } = usePromptLimits();
  const [showDetails, setShowDetails] = useState(false);

  if (!isGuest) {
    return null; // Don't show for logged-in users
  }

  const percentage = (remainingPrompts / totalAllowed) * 100;
  const isLow = remainingPrompts <= 2;

  return (
    <div className="fixed bottom-6 left-6 z-40">
      <div 
        className={`glass-card rounded-2xl border p-4 cursor-pointer transition-all ${
          isLow ? 'border-red-500/50 bg-red-500/10' : 'border-white/10 bg-black/40'
        }`}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            isLow ? 'bg-red-500/20' : 'bg-blue-500/20'
          }`}>
            <Sparkles className={`w-5 h-5 ${
              isLow ? 'text-red-400' : 'text-blue-400'
            }`} />
          </div>
          
          <div>
            <div className="text-sm font-medium text-white">
              {remainingPrompts} פרומפטים נותרו
            </div>
            <div className="text-xs text-slate-400">
              מתוך {totalAllowed} חינמיים
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${
              isLow ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {showDetails && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
            <div className="text-xs text-slate-400">
              <div>גישת אורחים: {settings.allow_guest_access ? '✅ מופעלת' : '❌ כבויה'}</div>
              <div>מצב תחזוקה: {settings.maintenance_mode ? '🔧 פעיל' : '✅ רגיל'}</div>
            </div>
            
            <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors">
              <LogIn className="w-4 h-4" />
              התחבר לפרומפטים ללא הגבלה
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
