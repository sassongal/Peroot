"use client";

import { cn } from "@/lib/utils";

interface ResultVariablesProps {
  placeholders: string[];
  variableValues: Record<string, string>;
  onUpdateVariable: (variable: string, value: string) => void;
  className?: string;
}

export function ResultVariables({
  placeholders,
  variableValues,
  onUpdateVariable,
  className
}: ResultVariablesProps) {
  if (placeholders.length === 0) return null;

  return (
    <div className={cn("glass-card p-6 rounded-2xl border-white/10 bg-white/[0.02] flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-500", className)}>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">חסרים להשלמה</h3>
        <p className="text-xs text-slate-500">
          מלא/י את המשתנים כדי להשלים את הפרומפט המקצועי שלך.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        {placeholders.map((ph, idx) => (
          <div key={`${ph}-${idx}`} className="space-y-1.5 group">
            <label className="text-xs text-sky-300/80 font-medium px-1 flex items-center justify-between">
              <span>{ph}</span>
              {variableValues[ph] ? (
                <span className="text-[10px] text-emerald-400 font-bold opacity-0 group-focus-within:opacity-100 transition-opacity">מלא</span>
              ) : (
                <span className="text-[10px] text-amber-500/70 animate-pulse">חובה</span>
              )}
            </label>
            <input
              dir="rtl"
              value={variableValues[ph] ?? ""}
              onChange={(e) => onUpdateVariable(ph, e.target.value)}
              className={cn(
                "w-full bg-black/40 border rounded-xl py-2.5 px-4 text-sm text-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/20",
                variableValues[ph] 
                  ? "border-emerald-500/30 bg-emerald-500/[0.02]" 
                  : "border-white/10 focus:border-sky-500/50"
              )}
              placeholder={`הכנס ${ph}...`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
