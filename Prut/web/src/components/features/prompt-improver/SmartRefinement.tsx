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
    <div className="glass-card rounded-xl border-white/10 bg-black/40 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
      <div className="p-6 border-b border-white/5 bg-white/[0.02]">
        <h3 className="text-xl font-serif text-white mb-2" dir="rtl">שאלות חידוד</h3>
        <p className="text-sm text-slate-400" dir="rtl">ה-AI שאל כמה שאלות כדי לדייק את התוצאה. ענה עליהן לתוצאה טובה יותר.</p>
      </div>
      
      <div className="p-6 space-y-4">
        {questions.length > 0 && questions.map((q, index) => {
           const isOpen = openIds.includes(q.id);
           const hasAnswer = !!answers[q.id]?.trim();
           const questionNumber = index + 1;
           
           return (
             <div key={q.id} className={cn(
               "relative rounded-xl border transition-all duration-300",
               isOpen ? "bg-white/[0.03] border-white/20" : "bg-transparent border-white/5 hover:bg-white/[0.02]"
             )}>
                <button
                   onClick={() => toggleOpen(q.id)}
                   className="w-full flex items-start text-right gap-4 p-4"
                   dir="rtl"
                >
                   <span className={cn(
                     "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ml-2", 
                     isOpen ? "bg-white text-black" : hasAnswer ? "bg-emerald-500 text-white" : "bg-white/10 text-slate-400"
                   )}>
                     {questionNumber}
                   </span>
                   <div className="flex-1 text-right">
                     <div className={cn("text-sm font-medium transition-colors", isOpen ? "text-white" : "text-slate-300")}>
                       {q.question}
                     </div>
                     {!isOpen && hasAnswer && (
                       <div className="mt-1 text-xs text-emerald-400 line-clamp-1">
                         {answers[q.id]}
                       </div>
                     )}
                   </div>
                   {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 mr-2" /> : <ChevronDown className="w-4 h-4 text-slate-600 mr-2" />}
                </button>
                
                {isOpen && (
                   <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 duration-200">
                      <div className="pr-11"> {/* Adjusted padding for RTL */}
                         <div className="mb-3">
                           <textarea
                             dir="rtl"
                             value={answers[q.id] || ""}
                             onChange={(e) => onAnswerChange(q.id, e.target.value)}
                             placeholder="הקלד/י תשובה כאן..."
                             className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-white/20 min-h-[80px] placeholder:text-slate-600 resize-y"
                           />
                         </div>
                        
                        {q.examples && q.examples.length > 0 && (
                          <div>
                             <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 text-right">דוגמאות</div>
                             <div className="flex flex-wrap gap-2 justify-start" dir="rtl">
                                {q.examples.map((example, i) => (
                                   <button
                                     key={i}
                                     onClick={() => onAnswerChange(q.id, example)}
                                     className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/5 bg-white/[0.02] text-xs text-slate-400 hover:bg-white/[0.08] hover:text-slate-200 transition-colors"
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
          "relative rounded-xl border transition-all duration-300 bg-white/[0.02] border-white/5",
        )}>
          <div className="p-4">
             <div className="flex items-center justify-between mb-3" dir="rtl">
                <div className="flex items-center gap-2">
                   <div className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full">מומלץ</div>
                   <div className="text-sm font-semibold text-slate-200">בקשה חופשית</div>
                </div>
             </div>
             <p className="text-xs text-slate-500 mb-3 text-right" dir="rtl">
               הוסף/י הוראות חידוד חופשיות (למשל: "תקצר את הטקסט", "תוסיף אימוג'ים").
             </p>
             <textarea
               dir="rtl"
               value={customInstruction}
               onChange={(e) => setCustomInstruction(e.target.value)}
               placeholder="למשל: שנה את הטון ליותר רשמי..."
               className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-white/20 min-h-[80px] placeholder:text-slate-600 resize-y"
             />
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-white/5 bg-white/[0.02]">
        <button
          onClick={() => onRefine(customInstruction)}
          disabled={isLoading || !hasAnyInput}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-black text-sm font-bold rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95"
        >
          {isLoading ? (
             <>
               <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
               <span>מעבד...</span>
             </>
          ) : (
             <>
               <Wand2 className="w-4 h-4" />
               <span>עדכן פרומפט</span>
             </>
          )}
        </button>
      </div>
    </div>
  );
}
