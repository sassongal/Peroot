"use client";

import { useState, useMemo, useEffect } from "react";
import { Save, Trash2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { VariablePreset } from "@/hooks/usePresets";
import { toast } from "sonner";

interface VariableFillerProps {
  promptText: string;
  onApply: (filledText: string) => void;
  presets: VariablePreset[];
  onSavePreset: (name: string, variables: Record<string, string>) => Promise<void>;
  onDeletePreset: (id: string) => Promise<void>;
}

function extractVariables(text: string): string[] {
  const matches = text.match(/\{([a-zA-Z_\u0590-\u05FF][a-zA-Z0-9_\u0590-\u05FF ]*)\}/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.slice(1, -1)))];
}

// Contextual placeholder examples per variable name
const VARIABLE_EXAMPLES: Record<string, string> = {
  name: "לירן שמעוני",
  company: "סטארט-אפ טכנולוגי",
  industry: "פינטק",
  product: "אפליקציית ניהול תקציב",
  target_audience: "בעלי עסקים קטנים",
  tone: "מקצועי ונגיש",
  role: "מנהל שיווק",
  topic: "אוטומציה בשירות לקוחות",
  blog_name: "TechPulse",
  language: "עברית",
  platform: "LinkedIn",
  brand: "Peroot",
  goal: "הגדלת המרות ב-20%",
  audience: "מפתחים ויזמים",
  subject: "השקת מוצר חדש",
  city: "תל אביב",
  field: "בינה מלאכותית",
};

function getVariablePlaceholder(varName: string): string {
  const lower = varName.toLowerCase().replace(/\s+/g, '_');
  if (VARIABLE_EXAMPLES[lower]) return VARIABLE_EXAMPLES[lower];
  // Check partial matches
  for (const [key, val] of Object.entries(VARIABLE_EXAMPLES)) {
    if (lower.includes(key) || key.includes(lower)) return val;
  }
  return `לדוגמה: ערך עבור ${varName}`;
}

export function VariableFiller({ promptText, onApply, presets, onSavePreset, onDeletePreset }: VariableFillerProps) {
  const variables = useMemo(() => extractVariables(promptText), [promptText]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => { setValues({}); }, [promptText]);
  const [presetName, setPresetName] = useState("");
  const [showSavePreset, setShowSavePreset] = useState(false);

  if (variables.length === 0) return null;

  const handleApply = () => {
    let filled = promptText;
    for (const [key, val] of Object.entries(values)) {
      filled = filled.replaceAll(`{${key}}`, val || `{${key}}`);
    }
    onApply(filled);
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                <span>טען פריסט</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", showPresets && "rotate-180")} />
              </button>
              {showPresets && (
                <div className="absolute top-full mt-1 left-0 right-0 min-w-[180px] bg-[#111] border border-white/10 rounded-lg shadow-xl z-10 overflow-hidden">
                  {presets.map(preset => (
                    <div key={preset.id} className="flex items-center justify-between px-3 py-2 hover:bg-white/5 group">
                      <button
                        onClick={() => loadPreset(preset)}
                        className="text-xs text-slate-300 hover:text-white flex-1 text-start truncate"
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

      {/* Variable inputs */}
      <div className="space-y-2 mb-4">
        {variables.map(v => (
          <div key={v} className="flex items-center gap-3">
            <label className="text-xs text-slate-400 w-28 shrink-0 truncate" title={v}>
              {`{${v}}`}
            </label>
            <input
              value={values[v] || ""}
              onChange={(e) => setValues(prev => ({ ...prev, [v]: e.target.value }))}
              placeholder={getVariablePlaceholder(v)}
              className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/20"
            />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleApply}
          disabled={Object.values(values).every(v => !v)}
          className="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          החל משתנים
        </button>

        {showSavePreset ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="שם הפריסט"
              className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/20"
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 text-slate-500 text-xs hover:text-slate-300 hover:bg-white/5 transition-colors"
          >
            <Save className="w-3 h-3" />
            שמור כפריסט
          </button>
        )}
      </div>
    </div>
  );
}
