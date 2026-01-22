"use client";

import { Check, Copy, Plus, ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { renderStyledPrompt } from "@/lib/text-utils";

interface ResultSectionProps {
  completion: string;
  completionScore: {
    score: number;
    label: string;
    tone?: { text: string; bg: string };
  } | null;
  improvementDelta: number;
  copied: boolean;
  onCopy: (text: string) => void;
  onBack: () => void;
  onSave: () => void;
  placeholders?: string[];
  variableValues?: Record<string, string>;
}

export function ResultSection({
  completion,
  completionScore,
  improvementDelta,
  copied,
  onCopy,
  onBack,
  onSave,
  placeholders = [],
  variableValues = {},
}: ResultSectionProps) {
  // Replace placeholders with their values for display, while keeping the structure
  const displayCompletion = completion.replace(/\{([^}]+)\}/g, (match, ph) => {
    return variableValues[ph] || match;
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass-card p-6 rounded-xl border-white/10 flex items-start justify-between group">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-serif text-slate-100 mb-1">הפרומפט המשופר שלך</h2>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>מוכן לשימוש</span>
            {improvementDelta > 0 && (
              <span className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full font-medium">
                +{improvementDelta}% בביצועים
              </span>
            )}
          </div>
        </div>
        {completionScore && (
          <div className="flex flex-col items-end">
            <div className={cn("text-xs font-semibold px-2 py-1 rounded-full bg-white/10 text-white mb-1")}>
              {completionScore.label} · {completionScore.score}%
            </div>
          </div>
        )}
      </div>

      <div className="glass-card rounded-xl border-white/10 bg-black/40 overflow-hidden relative group">
        <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onCopy(completion)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="העתק"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        
        <div 
          className="p-8 text-lg text-slate-200 leading-relaxed font-sans max-h-[60vh] overflow-y-auto styled-prompt-output" 
          dir="rtl"
          dangerouslySetInnerHTML={{ __html: renderStyledPrompt(displayCompletion) }}
        />


        <div className="p-4 bg-white/5 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
               <ThumbsUp className="w-4 h-4" />
             </button>
             <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
               <ThumbsDown className="w-4 h-4" />
             </button>
          </div>
          <div className="flex items-center gap-3">
             <button
                onClick={onBack}
                className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors font-bold"
             >
               חזרה לעריכה
             </button>
             <button
                onClick={onSave}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors"
             >
                <Plus className="w-4 h-4" />
                שמור
             </button>
             <button
                onClick={() => onCopy(completion)}
                className="flex items-center gap-2 px-6 py-2 rounded-lg bg-white text-black font-medium text-sm hover:bg-slate-200 transition-colors"
             >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "הועתק!" : "העתק פרומפט"}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
