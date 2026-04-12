"use client";

import { useState } from "react";
import { Link2, Plus, Play, Pencil, Trash2, Pin, HelpCircle, Copy, Download, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PromptChain } from "@/hooks/useChains";
import { PersonalPrompt } from "@/lib/types";
import { ChainBuilder } from "./ChainBuilder";
import { ChainRunner } from "./ChainRunner";
import { AutoChainBuilder } from "./AutoChainBuilder";
import { ChainPresetsGallery } from "./ChainPresetsGallery";
import { toast } from "sonner";
import { markFeatureUsed } from "@/hooks/useFeatureDiscovery";

interface ChainsSectionProps {
  chains: PromptChain[];
  personalPrompts: PersonalPrompt[];
  onAddChain: (
    chain: Omit<PromptChain, 'id' | 'use_count' | 'last_used_at' | 'created_at' | 'updated_at'>
  ) => Promise<string>;
  onUpdateChain: (
    id: string,
    updates: Partial<Pick<PromptChain, 'title' | 'description' | 'steps' | 'is_pinned'>>
  ) => Promise<void>;
  onDeleteChain: (id: string) => Promise<void>;
  onIncrementUseCount: (id: string) => Promise<void>;
  onUseStep: (promptText: string) => void;
  onDuplicateChain?: (chain: PromptChain) => Promise<string>;
  onExportChain?: (chain: PromptChain) => string;
  onImportChain?: (json: string) => Promise<string>;
}

export function ChainsSection({
  chains,
  personalPrompts,
  onAddChain,
  onUpdateChain,
  onDeleteChain,
  onIncrementUseCount,
  onUseStep,
  onDuplicateChain,
  onExportChain,
}: ChainsSectionProps) {
  const [showBuilder, setShowBuilder] = useState(false);
  const [showAutoBuilder, setShowAutoBuilder] = useState(false);
  const [editingChain, setEditingChain] = useState<PromptChain | null>(null);
  const [runningChain, setRunningChain] = useState<PromptChain | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const handleSave = async (
    title: string,
    description: string,
    steps: PromptChain['steps']
  ) => {
    if (editingChain) {
      await onUpdateChain(editingChain.id, { title, description, steps });
    } else {
      await onAddChain({ title, description, steps, is_pinned: false });
      markFeatureUsed("peroot_used_chains");
    }
    setShowBuilder(false);
    setEditingChain(null);
  };

  const handleAutoSave = async (title: string, description: string, steps: PromptChain["steps"]) => {
    const id = await onAddChain({ title, description, steps, is_pinned: false });
    markFeatureUsed("peroot_used_chains");
    markFeatureUsed("peroot_used_auto_chain");
    toast.success("שרשרת נשמרה בהצלחה!");
    return id;
  };

  const handleEdit = (chain: PromptChain) => {
    setEditingChain(chain);
    setShowBuilder(true);
  };

  const handleRun = (chain: PromptChain) => {
    onIncrementUseCount(chain.id);
    setRunningChain(chain);
  };

  const helpContent = (
    <div
      className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        showHelp ? "max-h-[500px] opacity-100 mt-3" : "max-h-0 opacity-0"
      )}
    >
      <div className="bg-(--glass-bg) border border-(--glass-border) rounded-xl p-4 text-sm text-(--text-muted) space-y-2" dir="rtl">
        <p className="font-medium text-(--text-secondary)">איך עובדות שרשראות פרומפטים?</p>
        <ul className="space-y-1.5 list-disc list-inside text-xs leading-relaxed">
          <li>שרשרת היא סדרה של פרומפטים שרצים אחד אחרי השני</li>
          <li>התוצאה של כל שלב יכולה לשמש כקלט אוטומטי לשלב הבא</li>
          <li>לחצו על <strong className="text-amber-400">צור שרשרת</strong> והוסיפו שלבים מהספרייה האישית או כתבו חדשים</li>
          <li>גררו שלבים כדי לשנות את הסדר</li>
          <li>לחצו <strong className="text-amber-400">הפעל</strong> כדי להריץ את השרשרת שלב אחרי שלב</li>
          <li>בתוך ה-Runner אפשר לפתוח כל שלב ישירות ב-ChatGPT / Claude / Gemini בלחיצה</li>
        </ul>
        <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5 space-y-1 mt-2">
          <p className="text-[11px] font-semibold text-amber-400">דוגמה:</p>
          <p className="text-[11px] leading-relaxed">
            &quot;מחקר שוק &lt;br&gt;→ סיכום ל-5 נקודות &lt;br&gt;→ פוסט לינקדאין&quot; — הפלט של השלב הראשון נזרק אוטומטית לשני, ואז לשלישי.
          </p>
        </div>
        <div className="text-[10px] text-(--text-muted)/80 pt-1.5 border-t border-(--glass-border) mt-2">
          <strong>מה נשמר:</strong> הכותרת, התיאור, כל השלבים עם המשתנים, וסדר השלבים. הפלטים שאתם מדביקים בזמן הריצה נשמרים רק באותו session (לא עולים לשרת).
        </div>
      </div>
    </div>
  );

  if (chains.length === 0 && !showBuilder) {
    return (
      <div className="border border-dashed border-(--glass-border) rounded-2xl p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Link2 className="w-8 h-8 text-amber-400/50" />
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-1.5 rounded-lg text-(--text-muted) hover:text-amber-400 hover:bg-(--glass-bg) transition-colors cursor-pointer"
            aria-label="עזרה על שרשראות"
            title="מה זה שרשראות?"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
        <h4 className="text-base font-medium text-(--text-secondary) mb-2">שרשראות פרומפטים</h4>
        <p className="text-sm text-(--text-muted) mb-4">
          בנה תהליכים מרובי שלבים - שלב אחד מוביל לבא
        </p>
        {helpContent}
        <div className="flex items-center gap-3 justify-center">
          <button
            onClick={() => setShowAutoBuilder(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-l from-amber-500 to-orange-500 text-black text-sm font-semibold hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Wand2 className="w-4 h-4" />
            בנה שרשרת אוטומטית
          </button>
          <button
            onClick={() => setShowBuilder(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-sm font-semibold hover:bg-amber-500/30 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            צור ידנית
          </button>
        </div>
        <ChainPresetsGallery onSaveChain={handleAutoSave} />
        {showAutoBuilder && (
          <AutoChainBuilder
            onSaveChain={handleAutoSave}
            onClose={() => setShowAutoBuilder(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-amber-400" />
          <h3 className="text-lg font-semibold text-(--text-primary)">שרשראות</h3>
          <span className="text-xs text-(--text-muted) bg-(--glass-bg) px-2 py-0.5 rounded-full">
            {chains.length}
          </span>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className={cn(
              "p-1 rounded-lg transition-colors cursor-pointer",
              showHelp ? "text-amber-400 bg-amber-500/10" : "text-(--text-muted) hover:text-amber-400 hover:bg-(--glass-bg)"
            )}
            aria-label="עזרה על שרשראות"
            title="מה זה שרשראות?"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAutoBuilder(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-linear-to-l from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 text-xs hover:from-amber-500/30 hover:to-orange-500/30 transition-all font-semibold"
          >
            <Wand2 className="w-3.5 h-3.5" />
            בנייה אוטומטית
          </button>
          <button
            onClick={() => {
              setEditingChain(null);
              setShowBuilder(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs hover:bg-amber-500/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            ידנית
          </button>
        </div>
      </div>

      {helpContent}

      {/* Chain Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {chains.map(chain => (
          <div
            key={chain.id}
            className={cn(
              "group border border-(--glass-border) rounded-xl p-4 bg-(--glass-bg) hover:bg-(--glass-bg) transition-colors",
              chain.is_pinned && "border-amber-500/20 bg-amber-500/2"
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {chain.is_pinned && (
                    <Pin className="w-3 h-3 text-amber-400 fill-amber-400" />
                  )}
                  <h4 className="text-sm font-medium text-(--text-secondary) truncate">
                    {chain.title}
                  </h4>
                </div>
                {chain.description && (
                  <p className="text-xs text-(--text-muted) truncate">{chain.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onUpdateChain(chain.id, { is_pinned: !chain.is_pinned })}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    chain.is_pinned
                      ? "text-amber-400"
                      : "text-(--text-muted) hover:text-(--text-secondary)"
                  )}
                  title={chain.is_pinned ? "בטל הצמדה" : "הצמד"}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleEdit(chain)}
                  className="p-1.5 rounded-lg text-(--text-muted) hover:text-(--text-secondary) transition-colors"
                  title="ערוך"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {onDuplicateChain && (
                  <button
                    onClick={async () => { await onDuplicateChain(chain); }}
                    className="p-1.5 rounded-lg text-(--text-muted) hover:text-(--text-secondary) transition-colors"
                    title="שכפל"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
                {onExportChain && (
                  <button
                    onClick={() => {
                      const json = onExportChain(chain);
                      navigator.clipboard.writeText(json);
                      toast.success("שרשרת הועתקה ללוח");
                    }}
                    className="p-1.5 rounded-lg text-(--text-muted) hover:text-(--text-secondary) transition-colors"
                    title="ייצוא"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => onDeleteChain(chain.id)}
                  className="p-1.5 rounded-lg text-(--text-muted) hover:text-red-400 transition-colors"
                  title="מחק"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Steps preview */}
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
              {chain.steps.map((step, i) => (
                <div key={step.id} className="flex items-center gap-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-(--glass-bg) text-(--text-muted) border border-(--glass-border) truncate max-w-[100px]">
                    {step.title}
                  </span>
                  {i < chain.steps.length - 1 && (
                    <span className="text-slate-600 text-[10px]">&larr;</span>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">
                {chain.steps.length} שלבים
                {chain.steps.some(s => s.variables && s.variables.length > 0) &&
                  ` · ${chain.steps.reduce((sum, s) => sum + (s.variables?.length || 0), 0)} משתנים`
                }
                {chain.use_count > 0 ? ` · שומש ${chain.use_count}x` : ""}
              </span>
              <button
                onClick={() => handleRun(chain)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--glass-bg) hover:bg-(--glass-bg) text-(--text-secondary) text-xs transition-colors"
              >
                <Play className="w-3 h-3" />
                הפעל
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Presets Gallery */}
      <ChainPresetsGallery onSaveChain={handleAutoSave} />

      {/* Builder Modal */}
      {showBuilder && (
        <ChainBuilder
          initialTitle={editingChain?.title}
          initialDescription={editingChain?.description}
          initialSteps={editingChain?.steps}
          personalPrompts={personalPrompts}
          onSave={handleSave}
          onClose={() => {
            setShowBuilder(false);
            setEditingChain(null);
          }}
        />
      )}

      {/* Runner Modal */}
      {runningChain && (
        <ChainRunner
          chain={runningChain}
          onClose={() => setRunningChain(null)}
          onUseStep={onUseStep}
        />
      )}

      {/* Auto Chain Builder Modal */}
      {showAutoBuilder && (
        <AutoChainBuilder
          onSaveChain={handleAutoSave}
          onClose={() => setShowAutoBuilder(false)}
        />
      )}
    </div>
  );
}
