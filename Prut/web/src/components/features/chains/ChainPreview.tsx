"use client";

import { useState, useCallback } from "react";
import {
  ArrowDown, Save, Play, ArrowRight, X, Plus, Trash2,
  Pencil, Check, GripVertical, Search, FileText, Image, Video, Bot,
  ChevronDown, ChevronUp, Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { GeneratedChain, GeneratedChainStep, ChainStepMode, ChainVariable } from "@/lib/chain-types";

const MODE_CONFIG: Record<ChainStepMode, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  text: { icon: FileText, label: "טקסט", color: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
  research: { icon: Search, label: "מחקר", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  image: { icon: Image, label: "תמונה", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  video: { icon: Video, label: "וידאו", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  agent: { icon: Bot, label: "סוכן", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
};

interface ChainPreviewProps {
  chain: GeneratedChain;
  onSave: (chain: GeneratedChain) => void;
  onRun?: () => void;
  onBack: () => void;
  onClose: () => void;
  onUpdateChain: (chain: GeneratedChain) => void;
}

export function ChainPreview({
  chain,
  onSave,
  onRun,
  onBack,
  onClose,
  onUpdateChain,
}: ChainPreviewProps) {
  const [editingStepIdx, setEditingStepIdx] = useState<number | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const toggleExpand = (idx: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const updateStep = useCallback((idx: number, updates: Partial<GeneratedChainStep>) => {
    const newSteps = [...chain.steps];
    newSteps[idx] = { ...newSteps[idx], ...updates };
    onUpdateChain({ ...chain, steps: newSteps });
  }, [chain, onUpdateChain]);

  const removeStep = useCallback((idx: number) => {
    if (chain.steps.length <= 2) {
      toast.error("שרשרת חייבת לפחות 2 שלבים");
      return;
    }
    const removedStepNum = chain.steps[idx].step_number;
    const newSteps = chain.steps
      .filter((_, i) => i !== idx)
      .map((s, i) => {
        const step = { ...s, step_number: i + 1 };
        // Reconnect: if this step pointed to the removed step, point to the one before it
        if (step.input_from_step === removedStepNum) {
          step.input_from_step = idx > 0 ? chain.steps[idx - 1].step_number : null;
          // Renumber after removal
          if (step.input_from_step !== null) {
            const newIdx = chain.steps.findIndex(s2 => s2.step_number === step.input_from_step);
            step.input_from_step = newIdx >= 0 && newIdx < idx ? newIdx + 1 : (i > 0 ? i : null);
          }
        } else if (step.input_from_step !== null && step.input_from_step > removedStepNum) {
          step.input_from_step = step.input_from_step - 1;
        }
        return step;
      });
    onUpdateChain({ ...chain, steps: newSteps });
    setEditingStepIdx(null);
  }, [chain, onUpdateChain]);

  const addStep = useCallback(() => {
    const lastStep = chain.steps[chain.steps.length - 1];
    const newStep: GeneratedChainStep = {
      step_number: chain.steps.length + 1,
      title: `שלב ${chain.steps.length + 1}`,
      mode: "text",
      prompt: "",
      variables: [],
      input_from_step: lastStep.step_number,
      output_description: "",
    };
    onUpdateChain({ ...chain, steps: [...chain.steps, newStep] });
    setEditingStepIdx(chain.steps.length);
    setExpandedSteps(prev => new Set([...prev, chain.steps.length]));
  }, [chain, onUpdateChain]);

  // Drag and drop reorder
  const handleDragStart = (idx: number) => setDragIndex(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === idx) return;
    const newSteps = [...chain.steps];
    const [moved] = newSteps.splice(dragIndex, 1);
    newSteps.splice(idx, 0, moved);
    // Renumber
    const renumbered = newSteps.map((s, i) => ({ ...s, step_number: i + 1 }));
    onUpdateChain({ ...chain, steps: renumbered });
    setDragIndex(idx);
  };
  const handleDragEnd = () => setDragIndex(null);

  const handleCopyPrompt = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("הועתק!");
    } catch { toast.error("שגיאה בהעתקה"); }
  };

  // Collect all global variables (from all steps, typically step 1)
  const globalVariables = chain.steps.flatMap(s => s.variables);

  return (
    <div className="p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 transition-colors"
            title="חזרה"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h3 className="text-lg font-semibold text-white">{chain.title}</h3>
            {chain.description && (
              <p className="text-xs text-slate-400 mt-0.5">{chain.description}</p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 text-slate-400 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-3 mb-6 mt-3 text-xs text-slate-500">
        <span>{chain.steps.length} שלבים</span>
        {globalVariables.length > 0 && (
          <>
            <span className="text-slate-700">|</span>
            <span>{globalVariables.length} משתנים: {globalVariables.map(v => v.label).join(", ")}</span>
          </>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-1">
        {chain.steps.map((step, idx) => {
          const modeConf = MODE_CONFIG[step.mode] || MODE_CONFIG.text;
          const ModeIcon = modeConf.icon;
          const isEditing = editingStepIdx === idx;
          const isExpanded = expandedSteps.has(idx);

          return (
            <div key={`step-${idx}`}>
              {/* Connector Arrow */}
              {idx > 0 && (
                <div className="flex justify-center py-1">
                  <div className="flex flex-col items-center">
                    <div className="w-px h-3 bg-amber-500/30" />
                    <ArrowDown className="w-4 h-4 text-amber-500/50" />
                  </div>
                </div>
              )}

              {/* Step Card */}
              <div
                className={cn(
                  "border rounded-xl transition-all",
                  isEditing
                    ? "border-amber-500/40 bg-amber-500/[0.03]"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]",
                  dragIndex === idx && "opacity-50 border-amber-500/30"
                )}
                draggable={!isEditing}
                onDragStart={() => handleDragStart(idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
              >
                {/* Step Header */}
                <div className="flex items-center gap-3 p-4">
                  {!isEditing && (
                    <GripVertical className="w-4 h-4 text-slate-600 cursor-grab active:cursor-grabbing shrink-0" />
                  )}

                  {/* Step number badge */}
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 shrink-0">
                    {step.step_number}
                  </span>

                  {/* Mode badge */}
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full border shrink-0", modeConf.color)}>
                    <ModeIcon className="w-3 h-3 inline-block me-1" />
                    {modeConf.label}
                  </span>

                  {/* Title */}
                  {isEditing ? (
                    <input
                      value={step.title}
                      onChange={e => updateStep(idx, { title: e.target.value })}
                      className="flex-1 bg-transparent text-sm text-white focus:outline-none border-b border-amber-500/30"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => toggleExpand(idx)}
                      className="flex-1 text-start text-sm font-medium text-slate-200 truncate"
                    >
                      {step.title}
                    </button>
                  )}

                  {/* Variables count */}
                  {step.variables.length > 0 && !isEditing && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0"
                      title={step.variables.map(v => v.label).join(", ")}
                    >
                      {step.variables.length} משתנים
                    </span>
                  )}

                  {/* Input source */}
                  {step.input_from_step && !isEditing && (
                    <span className="text-[10px] text-slate-500 shrink-0">
                      קלט: שלב {step.input_from_step}
                    </span>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing ? (
                      <button
                        onClick={() => setEditingStepIdx(null)}
                        className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        title="סיום עריכה"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleExpand(idx)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => { setEditingStepIdx(idx); setExpandedSteps(prev => new Set([...prev, idx])); }}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-amber-400 transition-colors"
                          title="ערוך שלב"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeStep(idx)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                          title="הסר שלב"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Output description (always visible when collapsed) */}
                {!isExpanded && !isEditing && step.output_description && (
                  <div className="px-4 pb-3 -mt-1">
                    <p className="text-[11px] text-slate-500 truncate">
                      פלט: {step.output_description}
                    </p>
                  </div>
                )}

                {/* Expanded / Editing Content */}
                {(isExpanded || isEditing) && (
                  <div className="px-4 pb-4 space-y-3 border-t border-white/5 mt-1 pt-3">
                    {/* Mode selector (editing) */}
                    {isEditing && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 shrink-0">מצב:</span>
                        <div className="flex gap-1.5">
                          {(Object.keys(MODE_CONFIG) as ChainStepMode[]).map(mode => {
                            const conf = MODE_CONFIG[mode];
                            const Icon = conf.icon;
                            return (
                              <button
                                key={mode}
                                onClick={() => updateStep(idx, { mode })}
                                className={cn(
                                  "flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] transition-colors",
                                  step.mode === mode ? conf.color : "border-white/5 text-slate-600 hover:text-slate-400"
                                )}
                              >
                                <Icon className="w-3 h-3" />
                                {conf.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Prompt text */}
                    {isEditing ? (
                      <textarea
                        value={step.prompt}
                        onChange={e => updateStep(idx, { prompt: e.target.value })}
                        className="w-full h-40 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/20 resize-none"
                        placeholder="הפרומפט המלא..."
                      />
                    ) : (
                      <div className="relative">
                        <pre className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto bg-black/20 rounded-lg p-3 border border-white/5">
                          {step.prompt}
                        </pre>
                        <button
                          onClick={() => handleCopyPrompt(step.prompt)}
                          className="absolute top-2 left-2 p-1.5 rounded-md bg-black/50 hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                          title="העתק"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Variables (editing) */}
                    {isEditing && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">משתנים:</span>
                          <button
                            onClick={() => {
                              const newVars: ChainVariable[] = [...step.variables, { name: `var_${step.variables.length + 1}`, label: "", default: "" }];
                              updateStep(idx, { variables: newVars });
                            }}
                            className="text-[10px] text-amber-400 hover:text-amber-300 transition-colors"
                          >
                            + הוסף משתנה
                          </button>
                        </div>
                        {step.variables.map((v, vi) => (
                          <div key={vi} className="flex items-center gap-2">
                            <input
                              value={v.label}
                              onChange={e => {
                                const newVars = [...step.variables];
                                newVars[vi] = { ...newVars[vi], label: e.target.value, name: e.target.value.replace(/\s+/g, "_") };
                                updateStep(idx, { variables: newVars });
                              }}
                              placeholder="תווית"
                              className="flex-1 bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500/20"
                            />
                            <input
                              value={v.default || ""}
                              onChange={e => {
                                const newVars = [...step.variables];
                                newVars[vi] = { ...newVars[vi], default: e.target.value };
                                updateStep(idx, { variables: newVars });
                              }}
                              placeholder="ברירת מחדל"
                              className="flex-1 bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500/20"
                            />
                            <button
                              onClick={() => {
                                const newVars = step.variables.filter((_, i) => i !== vi);
                                updateStep(idx, { variables: newVars });
                              }}
                              className="p-1 rounded hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Output description */}
                    {isEditing ? (
                      <div>
                        <span className="text-[11px] text-slate-500">פלט צפוי:</span>
                        <input
                          value={step.output_description}
                          onChange={e => updateStep(idx, { output_description: e.target.value })}
                          className="w-full mt-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500/20"
                          placeholder="תיאור הפלט הצפוי..."
                        />
                      </div>
                    ) : (
                      step.output_description && (
                        <p className="text-[11px] text-slate-500">
                          פלט צפוי: {step.output_description}
                        </p>
                      )
                    )}

                    {/* Variables display (not editing) */}
                    {!isEditing && step.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {step.variables.map((v, vi) => (
                          <span
                            key={vi}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400"
                          >
                            {v.label || v.name}
                            {v.default && <span className="text-blue-600 ms-1">({v.default})</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Step */}
      <button
        onClick={addStep}
        className="w-full mt-4 py-3 rounded-xl border border-dashed border-white/10 text-slate-500 hover:text-amber-400 hover:border-amber-500/30 transition-colors flex items-center justify-center gap-2 text-sm"
      >
        <Plus className="w-4 h-4" />
        הוסף שלב
      </button>

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          {onRun && (
            <button
              onClick={onRun}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              <Play className="w-4 h-4" />
              הרץ שרשרת
            </button>
          )}
        </div>
        <button
          onClick={() => onSave(chain)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 text-sm font-semibold transition-colors"
        >
          <Save className="w-4 h-4" />
          שמור שרשרת לספריה
        </button>
      </div>
    </div>
  );
}
