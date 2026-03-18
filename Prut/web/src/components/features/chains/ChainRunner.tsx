"use client";

import { useState } from "react";
import { X, Play, ChevronLeft, Check, Copy, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PromptChain } from "@/hooks/useChains";
import { toast } from "sonner";

interface ChainRunnerProps {
  chain: PromptChain;
  onClose: () => void;
  onUseStep: (promptText: string) => void;
}

export function ChainRunner({ chain, onClose, onUseStep }: ChainRunnerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [stepOutputs, setStepOutputs] = useState<Record<number, string>>({});

  const step = chain.steps[currentStep];
  if (!step) return null;

  const markCompleteAndNext = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    if (currentStep < chain.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("הועתק!");
    } catch {
      toast.error("שגיאה בהעתקה");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[80vh] overflow-y-auto bg-[#0f0f0f] border border-[var(--glass-border)] rounded-2xl p-6 mx-4"
        dir="rtl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{chain.title}</h3>
            {chain.description && (
              <p className="text-xs text-[var(--text-muted)] mt-1">{chain.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--glass-bg)] text-[var(--text-muted)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
          {chain.steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => setCurrentStep(i)}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors border",
                  i === currentStep
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                    : completedSteps.has(i)
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                    : "bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-muted)]"
                )}
              >
                {completedSteps.has(i) ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </button>
              {i < chain.steps.length - 1 && (
                <ArrowDown className="w-3 h-3 text-slate-600 mx-1 rotate-[-90deg]" />
              )}
            </div>
          ))}
        </div>

        {/* Current Step Content */}
        <div className="border border-amber-500/20 rounded-xl p-5 bg-amber-500/[0.02]">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
              שלב {currentStep + 1} מתוך {chain.steps.length}
            </span>
            <span className="text-sm font-medium text-[var(--text-primary)]">{step.title}</span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
            {step.prompt_text}
          </p>
        </div>

        {/* Step Output */}
        {currentStep > 0 && stepOutputs[currentStep - 1] && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
            <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1">פלט שלב קודם</div>
            <p className="text-xs text-[var(--text-muted)] line-clamp-3">{stepOutputs[currentStep - 1]}</p>
          </div>
        )}

        {completedSteps.has(currentStep) && (
          <div className="mt-3">
            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">הדבק את הפלט של שלב זה (אופציונלי):</label>
            <textarea
              value={stepOutputs[currentStep] || ""}
              onChange={e => setStepOutputs(prev => ({ ...prev, [currentStep]: e.target.value }))}
              placeholder="הדבק כאן את התוצאה..."
              className="w-full mt-1 h-20 bg-black/5 dark:bg-black/30 border border-[var(--glass-border)] rounded-lg px-3 py-2 text-xs text-[var(--text-secondary)] placeholder:text-slate-600 focus:outline-none focus:border-amber-500/20 resize-none"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 mt-5">
          <button
            onClick={() => {
              onUseStep(step.prompt_text);
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            השתמש בפרומפט
          </button>
          <button
            onClick={() => handleCopy(step.prompt_text)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--glass-border)] text-[var(--text-secondary)] text-sm hover:bg-[var(--glass-bg)] transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            העתק
          </button>
          <button
            onClick={markCompleteAndNext}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/10 transition-colors me-auto"
          >
            {currentStep < chain.steps.length - 1 ? (
              <>
                <ChevronLeft className="w-3.5 h-3.5" />
                סיים ועבור לשלב הבא
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                סיים שרשרת
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
