"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  ArrowDown,
  X,
  Save,
  HelpCircle,
  ChevronDown,
  FileText,
  Search,
  Image,
  Video,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChainStep } from "@/hooks/useChains";
import { PersonalPrompt } from "@/lib/types";

interface ChainBuilderProps {
  initialTitle?: string;
  initialDescription?: string;
  initialSteps?: ChainStep[];
  personalPrompts: PersonalPrompt[];
  onSave: (title: string, description: string, steps: ChainStep[]) => void;
  onClose: () => void;
}

export function ChainBuilder({
  initialTitle = "",
  initialDescription = "",
  initialSteps = [],
  personalPrompts,
  onSave,
  onClose,
}: ChainBuilderProps) {
  const STEP_MODES = [
    { key: "text", icon: FileText, label: "טקסט" },
    { key: "research", icon: Search, label: "מחקר" },
    { key: "image", icon: Image, label: "תמונה" },
    { key: "video", icon: Video, label: "וידאו" },
    { key: "agent", icon: Bot, label: "סוכן" },
  ] as const;

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  // Collapsed "how it works" card. Expanded by default on first build
  // (no initial title / no initial steps), collapsed when editing an
  // existing chain — experienced users don't need the explainer.
  const [introOpen, setIntroOpen] = useState(!initialTitle && initialSteps.length === 0);
  const [steps, setSteps] = useState<ChainStep[]>(
    initialSteps.length > 0
      ? initialSteps
      : [{ id: crypto.randomUUID(), prompt_text: "", title: "שלב 1", order: 0 }],
  );

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        prompt_text: "",
        title: `שלב ${prev.length + 1}`,
        order: prev.length,
      },
    ]);
  };

  const removeStep = (id: string) => {
    if (steps.length <= 1) return;
    setSteps((prev) =>
      prev
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, order: i, title: s.title || `שלב ${i + 1}` })),
    );
  };

  const updateStep = (id: string, updates: Partial<ChainStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const selectPromptForStep = (stepId: string, prompt: PersonalPrompt) => {
    updateStep(stepId, {
      prompt_id: prompt.id,
      prompt_text: prompt.prompt,
      title: prompt.title,
    });
  };

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const newSteps = [...steps];
    const [moved] = newSteps.splice(dragIndex, 1);
    newSteps.splice(index, 0, moved);
    setSteps(newSteps.map((s, i) => ({ ...s, order: i })));
    setDragIndex(index);
  };
  const handleDragEnd = () => setDragIndex(null);

  const handleSave = () => {
    if (!title.trim()) return;
    const validSteps = steps.filter((s) => s.prompt_text.trim());
    if (validSteps.length === 0) return;
    onSave(
      title.trim(),
      description.trim(),
      validSteps.map((s, i) => ({ ...s, order: i })),
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 mx-4"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">בניית שרשרת פרומפטים</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* How-it-works intro card — explains chains in 2-3 lines with a
            concrete example. Collapsible so it doesn't get in the way on
            re-visits. */}
        <div className="mb-5 rounded-xl border border-purple-500/20 bg-purple-500/5 overflow-hidden">
          <button
            type="button"
            onClick={() => setIntroOpen(!introOpen)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-purple-500/10 transition-colors"
            aria-expanded={introOpen}
          >
            <div className="flex items-center gap-2 text-purple-300">
              <HelpCircle className="w-4 h-4" />
              <span className="text-sm font-medium">איך שרשראות עובדות?</span>
            </div>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-purple-300 transition-transform",
                introOpen && "rotate-180",
              )}
            />
          </button>
          {introOpen && (
            <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <p>
                שרשרת פרומפטים היא רצף של 2–10 שלבים שמייצרים יחד תוצר מורכב. כל שלב מקבל את הפלט של
                השלב הקודם כקלט, כך שתוכל לפרק משימה גדולה (למשל: מחקר → סיכום → כתיבת פוסט → עריכה)
                לשלבים קטנים שכל אחד מהם מבצע משהו ממוקד.
              </p>
              <div className="rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-[11px] text-slate-400 space-y-1">
                <div className="text-purple-300 font-semibold">דוגמה: יצירת פוסט לינקדאין</div>
                <div>
                  1. מחקר על הנושא → 2. חילוץ 3 תובנות מרכזיות → 3. כתיבת טיוטה → 4. חידוד טון → 5.
                  הוספת hook
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                <strong className="text-slate-300">מה נשמר:</strong> השם, התיאור, כל השלבים, וסדר
                הריצה. ערכי משתנים נקבעים בזמן הריצה ולא נשמרים עם השרשרת.
              </p>
            </div>
          )}
        </div>

        {/* Title & Description */}
        <div className="space-y-3 mb-6">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="שם השרשרת"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/30"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="תיאור קצר (אופציונלי)"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/30"
          />
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.id} className="relative">
              {/* Connector Arrow */}
              {index > 0 && (
                <div className="flex justify-center -mt-1 mb-1">
                  <ArrowDown className="w-4 h-4 text-amber-500/50" />
                </div>
              )}
              <div
                className={cn(
                  "border border-white/10 rounded-xl p-4 bg-white/2 hover:bg-white/4 transition-colors",
                  dragIndex === index && "opacity-50 border-amber-500/30",
                )}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
              >
                <div className="flex items-center gap-3 mb-3">
                  <GripVertical className="w-4 h-4 text-slate-600 cursor-grab active:cursor-grabbing" />
                  <span className="text-xs font-bold text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    שלב {index + 1}
                  </span>
                  <input
                    value={step.title}
                    onChange={(e) => updateStep(step.id, { title: e.target.value })}
                    className="flex-1 bg-transparent text-sm text-slate-200 focus:outline-none border-b border-transparent focus:border-white/20"
                    placeholder="שם השלב"
                  />
                  {steps.length > 1 && (
                    <button
                      onClick={() => removeStep(step.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Prompt selector or text input */}
                <div className="space-y-2">
                  <textarea
                    value={step.prompt_text}
                    onChange={(e) => updateStep(step.id, { prompt_text: e.target.value })}
                    placeholder="כתוב פרומפט או בחר מהספריה..."
                    className="w-full h-24 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/20 resize-none"
                  />
                  {/* Quick select from personal library */}
                  {personalPrompts.length > 0 && !step.prompt_id && (
                    <details className="group">
                      <summary className="text-xs text-slate-500 hover:text-amber-400 cursor-pointer transition-colors">
                        בחר מהספריה האישית
                      </summary>
                      <div className="mt-2 max-h-32 overflow-y-auto space-y-1 border border-white/5 rounded-lg p-2 bg-black/30">
                        {personalPrompts.slice(0, 20).map((p) => (
                          <button
                            key={p.id}
                            onClick={() => selectPromptForStep(step.id, p)}
                            className="w-full text-start px-3 py-2 rounded-lg hover:bg-white/5 text-xs text-slate-400 hover:text-slate-200 transition-colors truncate"
                          >
                            {p.title}
                          </button>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Mode selector */}
                  <div className="flex items-center gap-1 pt-1 flex-wrap">
                    {STEP_MODES.map(({ key, icon: Icon, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          updateStep(step.id, {
                            mode: step.mode === key ? undefined : (key as ChainStep["mode"]),
                          })
                        }
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-colors border",
                          step.mode === key
                            ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                            : "border-white/5 text-slate-600 hover:text-slate-400 hover:border-white/10",
                        )}
                        title={label}
                      >
                        <Icon className="w-2.5 h-2.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Step */}
        <button
          onClick={addStep}
          className="w-full mt-4 py-3 rounded-xl border border-dashed border-white/10 text-slate-500 hover:text-amber-400 hover:border-amber-500/30 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          הוסף שלב
        </button>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:bg-white/5 text-sm transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || steps.every((s) => !s.prompt_text.trim())}
            className="px-5 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            שמור שרשרת
          </button>
        </div>
      </div>
    </div>
  );
}
