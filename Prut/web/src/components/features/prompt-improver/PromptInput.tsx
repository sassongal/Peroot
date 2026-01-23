"use client";

import { useRef, useEffect } from "react";
import { Wand2, Loader2 } from "lucide-react";

import { CATEGORY_OPTIONS } from "@/lib/constants";
import { CapabilityMode } from "@/lib/capability-mode";
import { CapabilitySelector } from "@/components/ui/CapabilitySelector";
import { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { highlightTextWithPlaceholders } from "@/lib/text-utils";

interface PromptInputProps {
  user: User | null;
  inputVal: string;
  setInputVal: (val: string) => void;
  handleEnhance: () => void;
  inputScore: {
    score: number;
    label: string;
    usageBoost: number;
    tips: string[];
    issues?: string[];
    suggestions?: string[];
  } | null;
  scoreTone: { text: string; bar: string } | null;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedCapability: CapabilityMode;
  setSelectedCapability: (mode: CapabilityMode) => void;
  isLoading: boolean;
  variables: string[];
  variableValues: Record<string, string>;
  setVariableValues: (values: Record<string, string>) => void;
  onApplyVariables: () => void;
}

export function PromptInput({
  inputVal,
  setInputVal,
  handleEnhance,
  inputScore,
  scoreTone,
  selectedCategory,
  setSelectedCategory,
  selectedCapability,
  setSelectedCapability,
  isLoading,
  variables,
  variableValues,
  setVariableValues,
  onApplyVariables,
}: PromptInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [inputVal]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Capability Mode Selector */}
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-xs text-slate-400 uppercase tracking-widest mb-3">מצב יכולת</div>
        <CapabilitySelector
          value={selectedCapability}
          onChange={setSelectedCapability}
          disabled={isLoading}
        />
      </div>

      <div className="w-full max-w-4xl mx-auto flex flex-col lg:flex-row gap-6 items-stretch">
        {variables.length > 0 && (
          <div className="w-full lg:w-72 glass-card p-4 rounded-2xl border-white/10 bg-white/[0.02]">
            <div className="text-xs text-slate-400 uppercase tracking-widest">משתנים</div>
            <p className="text-[11px] text-slate-500 mt-2">
              מלא/י ערכים והחלף אותם בפרומפט בלחיצה.
            </p>
            <div className="mt-4 space-y-3">
              {variables.map((variable, index) => {
                const inputId = `variable-input-${index}`;
                return (
                  <div key={`${variable}-${index}`} className="space-y-2">
                    <label htmlFor={inputId} className="text-xs text-sky-300 font-semibold">
                      {`{${variable}}`}
                    </label>
                    <input
                      id={inputId}
                      dir="rtl"
                      value={variableValues[variable] ?? ""}
                      onChange={(e) =>
                        setVariableValues({ ...variableValues, [variable]: e.target.value })
                      }
                      className="w-full bg-black/30 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50"
                      placeholder="הכנס ערך..."
                    />
                  </div>
                );
              })}
            </div>
            <button
              onClick={onApplyVariables}
              className="mt-4 w-full px-3 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-slate-200 transition-colors"
            >
              הכנס לפרומפט
            </button>
            {inputVal.trim() && (
              <div className="mt-4 space-y-2">
                <div className="text-xs text-slate-400 uppercase tracking-widest">תצוגה חיה:</div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-base md:text-lg text-slate-200 leading-relaxed min-h-[100px]">
                  {highlightTextWithPlaceholders(inputVal)}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 glass-card p-1 rounded-2xl border-white/10 bg-gradient-to-br from-white/[0.08] to-transparent shadow-2xl shadow-purple-900/20 group">
          <div className="bg-black/40 rounded-xl overflow-hidden flex flex-col gap-4 relative">
             <div
              aria-hidden
              className="absolute inset-0 p-6 md:p-8 text-lg md:text-xl text-slate-200 font-sans leading-relaxed whitespace-pre-wrap break-words pointer-events-none z-0 overflow-hidden"
              dir="rtl"
             >
              {highlightTextWithPlaceholders(inputVal)}
             </div>
            <textarea
              ref={textareaRef}
              dir="rtl"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="תאר/י את הפרומפט שלך כאן באופן חופשי... (למשל: 'אני צריך מייל ללקוח שהתלונן על המחיר')"
              className="w-full min-h-[160px] bg-transparent p-6 md:p-8 text-lg md:text-xl text-transparent caret-white placeholder:text-slate-600 focus:outline-none resize-none leading-relaxed relative z-10 font-sans overflow-hidden"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleEnhance();
                }
              }}
            />

            
            {inputScore && scoreTone && (
              <div className="px-6 pb-4 pt-2 border-t border-white/5 relative z-20 bg-black/20">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-mono tracking-widest">חוזק פרומפט</span>
                  <span className={cn("font-semibold", scoreTone.text)}>
                    {inputScore.label} · {inputScore.score}%
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={cn("h-full transition-all duration-500", scoreTone.bar)}
                    style={{ width: `${inputScore.score}%` }}
                  />
                </div>
                {inputScore.usageBoost > 0 && (
                  <div className="mt-2 text-[10px] text-slate-500">
                    כיול שימוש +{inputScore.usageBoost}
                  </div>
                )}
                {inputScore.tips.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {inputScore.tips.map((tip, index) => (
                      <span
                        key={`${tip}-${index}`}
                        className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-slate-300 border border-white/10"
                      >
                        {tip}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-t border-white/5 pt-5 p-5 md:p-7 relative z-20 bg-black/20">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest shrink-0">קטגוריה:</span>
                <div className="relative group/select min-w-[140px]">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 border border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/30 hover:bg-white/[0.05] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/10"
                  >
                    {CATEGORY_OPTIONS.map(cat => (
                      <option key={cat.id} value={cat.id} className="bg-zinc-900 text-slate-200">
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <button
                onClick={handleEnhance}
                disabled={isLoading || !inputVal.trim()}
                className={`
                  group relative px-6 py-4 rounded-xl font-bold transition-all duration-300
                  flex flex-col items-center justify-center gap-2 shadow-lg overflow-hidden min-w-[100px]
                  ${isLoading || !inputVal.trim() 
                    ? "bg-white/5 text-slate-500 cursor-not-allowed border border-white/5" 
                    : "bg-white text-black hover:scale-[1.05] hover:shadow-[0_0_40px_rgba(255,255,255,0.25)] border border-white"
                  }
                `}
              >
                <span className="relative z-10 flex flex-col items-center gap-1">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-8 h-8 md:w-10 md:h-10 animate-spin" />
                      <span className="text-[10px] uppercase tracking-tighter">מעבד...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-10 h-10 md:w-12 md:h-12 transition-transform group-hover:rotate-12 group-hover:scale-110" />
                      <span className="text-[10px] opacity-40 font-normal tracking-normal font-sans">⌘+Enter</span>
                    </>
                  )}
                </span>
                {!isLoading && inputVal.trim() && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-100%] group-hover:animate-shimmer" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Grid Removed as requested */}

      {/* Centered Navigation Tabs */}

    </div>
  );
}
