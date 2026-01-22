"use client";

import { Wand2, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { Question } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface SmartRefinementProps {
  questions: Question[];
  answers: Record<number, string>;
  onAnswerChange: (id: number, value: string) => void;
  onRefine: (customInstruction?: string) => void;
  isLoading: boolean;
}

export function SmartRefinement({
  questions,
  answers,
  onAnswerChange,
  onRefine,
  isLoading,
}: SmartRefinementProps) {
  const [openIds, setOpenIds] = useState<number[]>([]);
  const [customInstruction, setCustomInstruction] = useState("");

  const toggleOpen = (id: number) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };
  
  // Open the first question by default on mount if not empty
  useState(() => {
    if (questions.length > 0) {
        setOpenIds([questions[0].id]);
    }
  });

  const hasAnyInput = Object.values(answers).some(a => a.trim()) || customInstruction.trim();

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-white/5">
      <div className="p-6 border-b border-white/5">
        <h3 className="text-xl font-bold text-white mb-2">Improve Your Prompt</h3>
        <p className="text-sm text-slate-400">Answer these questions to get better results!</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {questions.length > 0 && questions.map((q, index) => {
           const isOpen = openIds.includes(q.id);
           const hasAnswer = !!answers[q.id]?.trim();
           const questionNumber = index + 1;
           
           return (
             <div key={q.id} className={cn(
               "relative rounded-2xl border transition-all duration-300",
               isOpen ? "bg-white border-white ring-4 ring-black/5" : "bg-white/5 border-white/10 hover:bg-white/10"
             )}>
                <button
                   onClick={() => toggleOpen(q.id)}
                   className="w-full flex items-start text-right gap-4 p-5"
                >
                   <span className={cn(
                     "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors", 
                     isOpen ? "bg-black text-white" : hasAnswer ? "bg-emerald-500 text-white" : "bg-white/10 text-slate-400"
                   )}>
                     {questionNumber}
                   </span>
                   <div className="flex-1">
                     <div className={cn("text-base font-semibold transition-colors", isOpen ? "text-black" : "text-white")}>
                       {q.question}
                     </div>
                     {!isOpen && hasAnswer && (
                       <div className="mt-2 text-sm text-emerald-400 line-clamp-1">
                         {answers[q.id]}
                       </div>
                     )}
                   </div>
                   {isOpen ? <ChevronUp className="w-5 h-5 text-black" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                </button>
                
                {isOpen && (
                   <div className="px-5 pb-5 pt-0 animate-in slide-in-from-top-2 duration-200">
                      <div className="pl-12">
                         <div className="mb-4">
                           <textarea
                             dir="rtl"
                             value={answers[q.id] || ""}
                             onChange={(e) => onAnswerChange(q.id, e.target.value)}
                             placeholder="Type your answer here..."
                             className="w-full bg-slate-100 border-0 rounded-xl p-4 text-base text-slate-900 focus:ring-2 focus:ring-black/10 min-h-[100px] placeholder:text-slate-400 resize-y"
                           />
                         </div>
                        
                        {q.examples && q.examples.length > 0 && (
                          <div>
                             <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Examples</div>
                             <div className="flex flex-wrap gap-2">
                                {q.examples.map((example, i) => (
                                   <button
                                     key={i}
                                     onClick={() => onAnswerChange(q.id, example)}
                                     className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
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

        <div className={cn(
          "relative rounded-2xl border transition-all duration-300",
          !questions.length ? "bg-white border-white" : "bg-white/5 border-white/10"
        )}>
          <div className="p-5">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                   <div className="bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-full">NEW</div>
                   <div className={cn("text-base font-semibold", !questions.length ? "text-black" : "text-white")}>Refine Your Prompt</div>
                </div>
             </div>
             <p className={cn("text-sm mb-4", !questions.length ? "text-slate-500" : "text-slate-400")}>
               Make quick edits or add missing details.
             </p>
             <textarea
               dir="rtl"
               value={customInstruction}
               onChange={(e) => setCustomInstruction(e.target.value)}
               placeholder="Limit length, set tone or style etc."
               className={cn(
                 "w-full rounded-xl p-4 text-base resize-y min-h-[100px]",
                 !questions.length 
                   ? "bg-slate-100 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-black/10"
                   : "bg-black/30 border border-white/10 text-white placeholder:text-slate-500 focus:border-white/20"
               )}
             />
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-white/5 bg-white/5 backdrop-blur-sm sticky bottom-0 z-10">
        <button
          onClick={() => onRefine(customInstruction)}
          disabled={isLoading || !hasAnyInput}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white text-black text-base font-bold rounded-xl hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl active:scale-95"
        >
          {isLoading ? (
             <>
               <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
               <span>מעבד...</span>
             </>
          ) : (
             <>
               <Wand2 className="w-5 h-5" />
               <span>נסח מחדש</span>
             </>
          )}
        </button>
      </div>
    </div>
  );
}
