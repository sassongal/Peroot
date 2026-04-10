"use client";

import { Wand2, ChevronDown, ChevronUp, Plus, Check } from "lucide-react";
import { AnimatedLogo } from "@/components/ui/AnimatedLogo";
import { Question } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  const [openIds, setOpenIds] = useState<number[]>([]);
  const [customInstruction, setCustomInstruction] = useState("");
  const prevQuestionsRef = useRef<number>(0);
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const toggleOpen = (id: number) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Open the first question by default only when NEW questions arrive
  useEffect(() => {
    if (questions?.length > 0 && questions.length !== prevQuestionsRef.current) {
      prevQuestionsRef.current = questions.length;
      queueMicrotask(() => setOpenIds([questions[0].id]));
    }
  }, [questions]);

  // Progress tracking
  const answeredCount = useMemo(
    () => questions.filter(q => answers[q.id]?.trim()).length,
    [questions, answers]
  );

  // Auto-advance to next unanswered question after answering
  const handleAnswerChange = useCallback((id: number, value: string) => {
    onAnswerChange(id, value);

    // If this answer is non-empty and was previously empty, auto-open next unanswered
    if (value.trim()) {
      const currentIndex = questions.findIndex(q => q.id === id);
      const currentAnswers = answersRef.current;
      const nextUnanswered = questions.find(
        (q, i) => i > currentIndex && !currentAnswers[q.id]?.trim()
      );
      if (nextUnanswered) {
        // Small delay so user sees the checkmark first
        setTimeout(() => {
          setOpenIds(prev => {
            if (prev.includes(nextUnanswered.id)) return prev;
            return [...prev, nextUnanswered.id];
          });
        }, 300);
      }
    }
  }, [onAnswerChange, questions]);

  const hasAnyInput = Object.values(answers).some(a => a.trim()) || customInstruction.trim();

  // When questions array is empty and component is rendered, the prompt was deemed comprehensive
  if (!questions?.length) {
    return (
      <div className="peroot-prompt-chat-panel glass-card rounded-xl border-[var(--glass-border)] bg-white/60 dark:bg-black/40 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
        <div className="p-6">
          <div className="flex items-center gap-3 justify-center py-4" dir="rtl">
            <span className="text-emerald-400 text-lg">✓</span>
            <span className="text-sm text-[var(--text-secondary)] font-medium">
              הפרומפט מקיף ומפורט - אין שאלות נוספות
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="peroot-prompt-chat-panel glass-card rounded-xl border-[var(--glass-border)] bg-white/60 dark:bg-black/40 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
      <div className="p-6 border-b border-[var(--glass-border)] bg-[var(--glass-bg)]">
        <div className="flex items-center justify-between" dir="rtl">
          <div>
            <h3 className="text-xl font-serif text-[var(--text-primary)] mb-1">{t.smart_refinement.title}</h3>
            <p className="text-sm text-[var(--text-muted)]">{t.smart_refinement.subtitle}</p>
          </div>
          {/* Progress indicator */}
          {questions.length > 0 && (
            <div className="flex items-center gap-2.5">
              <div className="flex gap-1">
                {questions.map((q) => (
                  <div
                    key={q.id}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300",
                      answers[q.id]?.trim()
                        ? "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]"
                        : "bg-black/10 dark:bg-white/10"
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

      <div className="p-6 space-y-4">
        {questions.length > 0 && questions.map((q, index) => {
           const isOpen = openIds.includes(q.id);
           const hasAnswer = !!answers[q.id]?.trim();
           const questionNumber = index + 1;

           return (
             <div key={q.id} className={cn(
               "relative rounded-xl border transition-all duration-300",
               hasAnswer && !isOpen
                 ? "bg-amber-500/[0.03] border-amber-500/20"
                 : isOpen
                   ? "bg-black/[0.03] dark:bg-white/[0.03] border-black/15 dark:border-white/20"
                   : "bg-transparent border-[var(--glass-border)] hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
             )}>
                <button
                   onClick={() => toggleOpen(q.id)}
                   aria-expanded={isOpen}
                   className="w-full flex items-start text-right gap-4 p-4 cursor-pointer"
                   dir="rtl"
                >
                   <span className={cn(
                     "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ms-2",
                     hasAnswer
                       ? "bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                       : isOpen
                         ? "bg-slate-900 dark:bg-white text-white dark:text-black"
                         : "bg-black/10 dark:bg-white/10 text-[var(--text-muted)]"
                   )}>
                     {hasAnswer ? <Check className="w-3.5 h-3.5" /> : questionNumber}
                   </span>
                   <div className="flex-1 text-right">
                     <div className={cn(
                       "text-sm font-medium transition-colors",
                       hasAnswer && !isOpen ? "text-amber-700/80 dark:text-amber-200/80" : isOpen ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                     )}>
                       {q.question}
                     </div>
                     {!isOpen && hasAnswer && (
                       <div className="mt-1 text-xs text-amber-400/70 line-clamp-1">
                         {answers[q.id]}
                       </div>
                     )}
                   </div>
                   {isOpen ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)] me-2" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)] me-2" />}
                </button>

                {isOpen && (
                   <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 duration-200">
                      <div className="ps-11">
                         <div className="mb-3">
                           <textarea
                             dir="rtl"
                             value={answers[q.id] || ""}
                             onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                             placeholder={t.smart_refinement.placeholder}
                             aria-label={`תשובה לשאלה: ${q.question}`}
                             className="w-full bg-black/5 dark:bg-black/30 border border-[var(--glass-border)] rounded-lg p-3 text-base md:text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-500/30 min-h-[80px] placeholder:text-[var(--text-muted)] resize-y transition-colors"
                           />
                         </div>

                        {q.examples && q.examples.length > 0 && (
                          <div>
                             <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 text-right">{t.smart_refinement.examples_label}</div>
                             <div className="flex flex-wrap gap-2 justify-start" dir="rtl">
                                {q.examples.map((example, i) => (
                                   <button
                                     key={i}
                                     onClick={() => handleAnswerChange(q.id, example)}
                                     className="flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] text-xs text-[var(--text-muted)] hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-300 hover:border-amber-500/20 transition-colors cursor-pointer"
                                   >
                                     <Plus className="w-3 h-3" />
                                     <span>{example}</span>
                                   </button>
                                ))}
                             </div>
                          </div>
                        )}
                      </div>
                   </div>
                )}
             </div>
           );
        })}

        {/* Custom Refinement Box */}
        <div className={cn(
          "relative rounded-xl border transition-all duration-300 bg-[var(--glass-bg)] border-[var(--glass-border)]",
        )}>
          <div className="p-4">
             <div className="flex items-center justify-between mb-3" dir="rtl">
                <div className="flex items-center gap-2">
                   <div className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">{t.smart_refinement.recommended}</div>
                   <div className="text-sm font-semibold text-[var(--text-primary)]">{t.smart_refinement.free_request}</div>
                </div>
             </div>
             <p className="text-xs text-slate-500 mb-3 text-right" dir="rtl">
                {t.smart_refinement.free_request_hint}
             </p>
             <textarea
               dir="rtl"
               value={customInstruction}
               onChange={(e) => setCustomInstruction(e.target.value)}
               placeholder={t.smart_refinement.free_request_placeholder}
               aria-label="הוראה חופשית לשיפור הפרומפט"
               className="w-full bg-black/5 dark:bg-black/30 border border-[var(--glass-border)] rounded-lg p-3 text-base md:text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-500/30 min-h-[80px] placeholder:text-[var(--text-muted)] resize-y transition-colors"
             />
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-[var(--glass-border)] bg-[var(--glass-bg)]">
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
  );
}
