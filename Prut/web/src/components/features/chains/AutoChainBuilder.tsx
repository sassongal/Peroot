"use client";

import { useState, useCallback } from "react";
import { Wand2, X, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeneratedChain, ChainGenerateRequest } from "@/lib/chain-types";
import type { ChainStep } from "@/hooks/useChains";
import { ChainPreview } from "./ChainPreview";

interface AutoChainBuilderProps {
  onSaveChain: (title: string, description: string, steps: ChainStep[]) => Promise<string>;
  onClose: () => void;
  onRunChain?: (chain: GeneratedChain) => void;
  userRole?: string;
  recentCategories?: string[];
}

const EXAMPLE_GOALS = [
  "Newsletter שבועי בתחום הטכנולוגיה",
  "סדרת 5 פוסטים לאינסטגרם למוצר חדש",
  "מאמר SEO מלא כולל meta tags",
  "תוכנית שיעור שבועית במתמטיקה",
  "קמפיין מודעות מלא לפייסבוק",
  "הצעת מחיר ללקוח חדש",
];

export function AutoChainBuilder({
  onSaveChain,
  onClose,
  onRunChain,
  userRole,
  recentCategories,
}: AutoChainBuilderProps) {
  const [goal, setGoal] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedChain, setGeneratedChain] = useState<GeneratedChain | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!goal.trim() || isGenerating) return;
    setIsGenerating(true);
    setError(null);

    try {
      const body: ChainGenerateRequest = {
        goal: goal.trim(),
        max_steps: 5,
        user_context: {
          role: userRole,
          recent_categories: recentCategories,
        },
      };

      const res = await fetch("/api/chain/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error (${res.status})`);
      }

      const chain: GeneratedChain = await res.json();
      setGeneratedChain(chain);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה ביצירת השרשרת");
    } finally {
      setIsGenerating(false);
    }
  }, [goal, isGenerating, userRole, recentCategories]);

  const handleSave = useCallback(async (chain: GeneratedChain) => {
    const steps = chain.steps.map((s, i) => ({
      id: crypto.randomUUID(),
      prompt_text: s.prompt,
      title: s.title,
      order: i,
      mode: s.mode,
      variables: s.variables,
      input_from_step: s.input_from_step,
      output_description: s.output_description,
    }));
    await onSaveChain(chain.title, chain.description, steps);
    onClose();
  }, [onSaveChain, onClose]);

  // Show preview if we have a generated chain
  if (generatedChain) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0f0f0f] border border-white/10 rounded-2xl mx-4"
          onClick={e => e.stopPropagation()}
        >
          <ChainPreview
            chain={generatedChain}
            onSave={handleSave}
            onRun={onRunChain ? () => onRunChain(generatedChain) : undefined}
            onBack={() => setGeneratedChain(null)}
            onClose={onClose}
            onUpdateChain={setGeneratedChain}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 mx-4"
        dir="rtl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">בניית שרשרת אוטומטית</h3>
              <p className="text-xs text-slate-400">תאר את המטרה הסופית ו-AI יבנה שרשרת פרומפטים</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Goal Input */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-300">מה המטרה הסופית?</label>
          <textarea
            value={goal}
            onChange={e => setGoal(e.target.value)}
            placeholder="לדוגמה: Newsletter שבועי בתחום הטכנולוגיה — כולל מחקר, כתיבת תוכן, subject lines ופוסט לסושיאל"
            className="w-full h-28 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/30 resize-none"
            disabled={isGenerating}
          />
        </div>

        {/* Example Goals */}
        <div className="mt-4">
          <p className="text-[11px] text-slate-500 mb-2">או בחר דוגמה:</p>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLE_GOALS.map((example) => (
              <button
                key={example}
                onClick={() => setGoal(example)}
                disabled={isGenerating}
                className="text-[11px] px-2.5 py-1.5 rounded-lg border border-white/5 text-slate-500 hover:text-amber-400 hover:border-amber-500/20 transition-colors disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        {/* Generate Button */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:bg-white/5 text-sm transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={handleGenerate}
            disabled={!goal.trim() || isGenerating}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all",
              isGenerating
                ? "bg-amber-500/10 border border-amber-500/20 text-amber-300 cursor-wait"
                : "bg-gradient-to-l from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                בונה שרשרת...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                בנה שרשרת
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
