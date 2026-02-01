import { usePromptLimits } from "@/hooks/usePromptLimits";
import { useState } from "react";
import { LogIn, Sparkles, Coins } from "lucide-react";
import { useRouter } from "next/navigation";

export function PromptLimitIndicator() {
  const { remainingPrompts, totalAllowed, isGuest, settings } = usePromptLimits();
  const [showDetails, setShowDetails] = useState(false);
  const router = useRouter();

  if (!isGuest) {
    return null; // Don't show for logged-in users
  }

  const percentage = (remainingPrompts / totalAllowed) * 100;
  const isLow = remainingPrompts <= 2;

  const handleLogin = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push('/login');
  };

  return (
    <div className="fixed bottom-6 left-6 z-40">
      <div 
        className={`glass-card rounded-2xl border p-4 cursor-pointer transition-all hover:bg-black/60 shadow-xl ${
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
            <div className="text-sm font-medium text-white flex items-center gap-2">
              {remainingPrompts} <span className="text-slate-400 font-normal">קרדיטים</span>
            </div>
            <div className="text-xs text-slate-400">
              לחשבון אורח (מתחדש)
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
          <div className="mt-4 pt-4 border-t border-white/10 space-y-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="text-xs text-slate-400 space-y-1">
              <div className="flex items-center gap-1">
                <Coins className="w-3 h-3" />
                <span>כל פרומפט = קרדיט אחד</span>
              </div>
              <div>גישת אורחים: {settings.allow_guest_access ? '✅ פתוחה' : '❌ סגורה'}</div>
            </div>
            
            <button 
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors text-white font-medium shadow-lg shadow-blue-900/20"
            >
              <LogIn className="w-4 h-4" />
              התחבר ללא הגבלה
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
