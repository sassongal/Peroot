"use client";

import { Wand2, Check, ChevronDown } from "lucide-react";
import { AnimatedLogo } from "@/components/ui/AnimatedLogo";
import { Question } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useState, useMemo, useEffect } from "react";
import { useI18n } from "@/context/I18nContext";

interface SmartRefinementProps {
  questions: Question[];
  answers: Record<string, string>;
  onAnswerChange: (id: number, value: string) => void;
  onRefine: (customInstruction?: string) => void;
  isLoading: boolean;
}

export function SmartRefinement({
  questions = [],
  answers,
  onAnswerChange,
  onRefine,
  isLoading,
}: SmartRefinementProps) {
  const t = useI18n();
  const [customInstruction, setCustomInstruction] = useState("");
  const [showArrow, setShowArrow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowArrow(false), 3000);
    return () => clearTimeout(t);
  }, []);

  const answeredCount = useMemo(
    () => questions.filter((q) => answers[String(q.id)]?.trim()).length,
    [questions, answers],
  );

  const hasAnyInput = Object.values(answers).some((a) => a.trim()) || customInstruction.trim();

  if (!questions?.length) {
    return (
      <div className="peroot-prompt-chat-panel glass-card rounded-xl border-(--glass-border) bg-white/60 dark:bg-black/40 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
        <div className="p-6">
          <div className="flex items-center gap-3 justify-center py-4" dir="rtl">
            <span className="text-emerald-400 text-lg">✓</span>
            <span className="text-sm text-(--text-secondary) font-medium">
              הפרומפט מקיף ומפורט - אין שאלות נוספות
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Bounce arrow — visible for 3s after questions arrive */}
      <div
        className={cn(
          "flex flex-col items-center gap-0.5 transition-opacity duration-700",
          showArrow ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        aria-hidden="true"
      >
        {[0, 1, 2].map((i) => (
          <ChevronDown
            key={i}
            className="w-5 h-5 text-amber-500 animate-bounce"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>

      <div className="peroot-prompt-chat-panel glass-card rounded-xl border-(--glass-border) bg-white/60 dark:bg-black/40 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
        {/* Header */}
        <div className="p-6 border-b border-(--glass-border) bg-(--glass-bg)">
          <div className="flex items-center justify-between" dir="rtl">
            <div>
              <h3 className="text-xl font-serif text-(--text-primary) mb-1">
                {t.smart_refinement.title}
              </h3>
              <p className="text-sm text-(--text-muted)">{t.smart_refinement.subtitle}</p>
            </div>
            {questions.length > 0 && (
              <div className="flex items-center gap-2.5">
                <div className="flex gap-1">
                  {questions.map((q) => (
                    <div
                      key={q.id}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all duration-300",
                        answers[String(q.id)]?.trim()
                          ? "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]"
                          : "bg-black/10 dark:bg-white/10",
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  {answeredCount}/{questions.length}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Questions */}
        <div className="p-6 space-y-6">
          {questions.map((q, index) => {
            const hasAnswer = !!answers[String(q.id)]?.trim();
            const activeChip = q.examples.find((e) => answers[String(q.id)] === e) ?? null;

            return (
              <div key={q.id} className="flex flex-col gap-2.5">
                {/* Question header */}
                <div className="flex items-center gap-2 flex-wrap" dir="rtl">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                      hasAnswer
                        ? "bg-amber-500 text-black shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                        : "bg-black/10 dark:bg-white/10 text-(--text-muted)",
                    )}
                  >
                    {hasAnswer ? <Check className="w-3 h-3" /> : index + 1}
                  </span>
                  <span className="text-sm font-medium text-(--text-primary)">{q.question}</span>
                  {q.impactEstimate && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-medium">
                      {q.impactEstimate}
                    </span>
                  )}
                </div>

                {/* Chips */}
                {q.examples.length > 0 && (
                  <div className="flex flex-wrap gap-2" dir="rtl">
                    {q.examples.map((example, i) => {
                      const isSelected = activeChip === example;
                      return (
                        <button
                          key={i}
                          onClick={() => onAnswerChange(q.id, isSelected ? "" : example)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-all cursor-pointer",
                            isSelected
                              ? "bg-amber-500 border-amber-500 text-black font-semibold shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                              : "border-(--glass-border) bg-(--glass-bg) text-(--text-muted) hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-300 hover:border-amber-500/20",
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          <span>{example}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Custom text input */}
                <input
                  dir="rtl"
                  type="text"
                  value={activeChip ? "" : answers[String(q.id)] || ""}
                  onChange={(e) => onAnswerChange(q.id, e.target.value)}
                  placeholder={t.smart_refinement.placeholder}
                  aria-label={`תשובה לשאלה: ${q.question}`}
                  className="w-full bg-black/5 dark:bg-black/30 border border-(--glass-border) rounded-lg px-3 py-2 text-sm text-(--text-primary) focus:outline-none focus:border-amber-500/30 placeholder:text-(--text-muted) transition-colors"
                />
              </div>
            );
          })}

          {/* Custom instruction */}
          <div className="pt-2 border-t border-(--glass-border)">
            <div className="flex items-center gap-2 mb-2" dir="rtl">
              <div className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {t.smart_refinement.recommended}
              </div>
              <span className="text-sm font-semibold text-(--text-primary)">
                {t.smart_refinement.free_request}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-2 text-right" dir="rtl">
              {t.smart_refinement.free_request_hint}
            </p>
            <textarea
              dir="rtl"
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder={t.smart_refinement.free_request_placeholder}
              aria-label="הוראה חופשית לשיפור הפרומפט"
              className="w-full bg-black/5 dark:bg-black/30 border border-(--glass-border) rounded-lg p-3 text-sm text-(--text-primary) focus:outline-none focus:border-amber-500/30 min-h-[72px] placeholder:text-(--text-muted) resize-y transition-colors"
            />
          </div>
        </div>

        {/* Refine button */}
        <div className="p-4 border-t border-(--glass-border) bg-(--glass-bg)">
          <button
            onClick={() => onRefine(customInstruction)}
            disabled={isLoading || !hasAnyInput}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 accent-gradient text-black text-sm font-bold rounded-lg hover:shadow-[0_0_25px_rgba(245,158,11,0.3)] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg active:scale-[0.97] cursor-pointer"
          >
            {isLoading ? (
              <>
                <AnimatedLogo size="sm" />
                <span>{t.smart_refinement.processing}</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                <span>{t.smart_refinement.refine_button}</span>
                {answeredCount > 0 && (
                  <span className="bg-black/20 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                    {answeredCount} תשובות
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
