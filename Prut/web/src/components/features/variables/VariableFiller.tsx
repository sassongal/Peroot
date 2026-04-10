"use client";

import { useState, useMemo, useEffect } from "react";
import { Save, Trash2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { VariablePreset } from "@/hooks/usePresets";
import { toast } from "sonner";
import {
  extractVariables,
  getVariableLabel,
  getVariablePlaceholder,
  substituteVariables,
} from "@/lib/variable-utils";

interface VariableFillerProps {
  promptText: string;
  onApply: (filledText: string) => void;
  presets: VariablePreset[];
  onSavePreset: (name: string, variables: Record<string, string>) => Promise<void>;
  onDeletePreset: (id: string) => Promise<void>;
}

export function VariableFiller({ promptText, onApply, presets, onSavePreset, onDeletePreset }: VariableFillerProps) {
  const variables = useMemo(() => extractVariables(promptText), [promptText]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setValues({}));
  }, [promptText]);
  const [presetName, setPresetName] = useState("");
  const [showSavePreset, setShowSavePreset] = useState(false);

  if (variables.length === 0) return null;

  const handleApply = () => {
    // Canonical substitution via the shared helper — identical logic to
    // ResultSection and all other call sites, so behavior stays uniform
    // across the whole app.
    onApply(substituteVariables(promptText, values));
  };

  const loadPreset = (preset: VariablePreset) => {
    setValues(prev => ({ ...prev, ...preset.variables }));
    setShowPresets(false);
    toast.success(`נטען: ${preset.name}`);
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) return;
    const filledVars: Record<string, string> = {};
    for (const v of variables) {
      if (values[v]) filledVars[v] = values[v];
    }
    await onSavePreset(presetName.trim(), filledVars);
    setPresetName("");
    setShowSavePreset(false);
    toast.success("הפריסט נשמר");
  };

  return (
    <div className="border border-amber-500/20 rounded-xl p-4 bg-amber-500/[0.02]" dir="rtl">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-amber-400">משתנים לפרומפט</h4>
        <div className="flex items-center gap-2">
          {presets.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowPresets(!showPresets)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                <span>טען פריסט</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", showPresets && "rotate-180")} />
              </button>
              {showPresets && (
                <div className="absolute top-full mt-1 left-0 right-0 min-w-[180px] bg-[#111] border border-[var(--glass-border)] rounded-lg shadow-xl z-10 overflow-hidden">
                  {presets.map(preset => (
                    <div key={preset.id} className="flex items-center justify-between px-3 py-2 hover:bg-[var(--glass-bg)] group">
                      <button
                        onClick={() => loadPreset(preset)}
                        className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex-1 text-start truncate"
                      >
                        {preset.name}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeletePreset(preset.id); }}
                        className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Variable inputs — Hebrew labels from the canonical registry,
          matching the ResultSection Variables Panel. The raw snake_case
          key is exposed only through the `title` tooltip for power users. */}
      <div className="space-y-2 mb-4">
        {variables.map(v => {
          const label = getVariableLabel(v);
          const isFilled = (values[v] ?? "").trim().length > 0;
          return (
            <div key={v} className="flex items-center gap-3">
              <label
                className="text-xs text-[var(--text-secondary)] w-28 shrink-0 truncate font-medium"
                title={v}
              >
                {label}
              </label>
              <input
                value={values[v] || ""}
                onChange={(e) => setValues(prev => ({ ...prev, [v]: e.target.value }))}
                placeholder={getVariablePlaceholder(v)}
                aria-label={label}
                className={cn(
                  "flex-1 rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)] placeholder:text-slate-600 focus:outline-none transition-colors border",
                  isFilled
                    ? "bg-emerald-500/[0.04] border-emerald-500/40 focus:border-emerald-500/60"
                    : "bg-black/5 dark:bg-black/30 border-[var(--glass-border)] focus:border-sky-500/50"
                )}
              />
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleApply}
          disabled={Object.values(values).every(v => !v)}
          className="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          החל משתנים
        </button>

        {showSavePreset ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="שם הפריסט"
              className="flex-1 bg-black/5 dark:bg-black/30 border border-[var(--glass-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)] placeholder:text-slate-600 focus:outline-none focus:border-amber-500/20"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSavePreset(); }}
            />
            <button
              onClick={handleSavePreset}
              className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSavePreset(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--glass-border)] text-[var(--text-muted)] text-xs hover:text-[var(--text-secondary)] hover:bg-[var(--glass-bg)] transition-colors"
          >
            <Save className="w-3 h-3" />
            שמור כפריסט
          </button>
        )}
      </div>
    </div>
  );
}
