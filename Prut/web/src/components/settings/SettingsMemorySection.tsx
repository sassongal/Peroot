"use client";

import { useState } from "react";
import { Brain, X, Plus, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { useUserMemory } from "@/hooks/useUserMemory";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { key: "professional", label: "עבודה ותחום" },
  { key: "personal", label: "אישי" },
  { key: "preference", label: "העדפות סגנון" },
  { key: "project", label: "פרויקט נוכחי" },
  { key: "language", label: "שפה ופורמט" },
  { key: "general", label: "כללי" },
] as const;

// One hue per category, readable on both grounds (700 on light, 300 on dark).
const CATEGORY_COLORS: Record<string, string> = {
  professional: "border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-200",
  personal: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  preference: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  project: "border-indigo-500/30 bg-indigo-500/10 text-indigo-800 dark:text-indigo-200",
  language: "border-pink-500/30 bg-pink-500/10 text-pink-800 dark:text-pink-200",
  general: "border-(--glass-border) bg-(--glass-bg) text-(--text-secondary)",
};

export function SettingsMemorySection() {
  const { facts, isLoading, addFact, deleteFact } = useUserMemory();
  const [newFact, setNewFact] = useState("");
  const [newCategory, setNewCategory] = useState<string>("general");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newFact.trim() || isAdding) return;
    setIsAdding(true);
    const result = await addFact(newFact.trim(), newCategory);
    if (result.success) {
      setNewFact("");
    } else {
      toast.error(result.error || "שגיאה בשמירת העובדה");
    }
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await deleteFact(id);
    if (!result.success) {
      toast.error("שגיאה במחיקת העובדה");
    }
    setDeletingId(null);
  };

  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    items: facts.filter((f) => f.category === cat.key),
  })).filter((g) => g.items.length > 0);

  return (
    <section
      className="space-y-6 animate-in fade-in duration-300"
      aria-labelledby="settings-memory-heading"
    >
      <header className="space-y-1">
        <h2 id="settings-memory-heading" className="text-xl font-bold">
          זיכרון AI
        </h2>
        <p className="text-sm text-(--text-muted)">
          מה פירוט יודע עליכם, ומחיל על כל שיפור מהפרומפט הראשון
        </p>
      </header>

      <div className="flex items-start gap-2.5 rounded-xl border border-(--glass-border) bg-(--glass-bg) px-4 py-3">
        <Info className="w-4 h-4 text-(--text-muted) shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-(--text-muted) leading-relaxed">
          הזיכרון נבנה לבד מהפרומפטים שאתם כותבים. אפשר להוסיף עובדה ידנית, ולמחוק כל עובדה שאינה
          מדויקת. עד 100 עובדות.
        </p>
      </div>

      {/* Manual add */}
      <div className="space-y-2">
        <label htmlFor="memory-new-fact" className="text-xs font-medium text-(--text-muted)">
          הוספת עובדה ידנית
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="memory-new-fact"
            value={newFact}
            onChange={(e) => setNewFact(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="למשל: מנהלת מוצר בחברת SaaS"
            dir="auto"
            className="flex-1 min-w-0 bg-(--surface-panel) border border-(--glass-border) rounded-xl px-3 min-h-[44px] text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/60 transition-colors"
            maxLength={300}
          />
          <div className="flex gap-2">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              aria-label="קטגוריה"
              className="flex-1 sm:flex-none sm:min-w-[120px] bg-(--surface-panel) border border-(--glass-border) rounded-xl px-2 min-h-[44px] text-sm text-(--text-secondary) focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/60 transition-colors cursor-pointer"
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newFact.trim() || isAdding || facts.length >= 100}
              className="cursor-pointer flex items-center gap-1.5 px-3 min-h-[44px] rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isAdding ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="w-4 h-4" aria-hidden="true" />
              )}
              הוספה
            </button>
          </div>
        </div>
      </div>

      {/* Facts list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-(--text-muted)" aria-label="טוען" />
        </div>
      ) : facts.length === 0 ? (
        <div className="text-center py-10 space-y-2">
          <Brain className="w-10 h-10 text-(--text-muted) mx-auto" aria-hidden="true" />
          <p className="text-sm text-(--text-secondary)">
            עוד אין עובדות. פירוט ילמד אתכם תוך כדי שימוש
          </p>
          <p className="text-xs text-(--text-muted)">
            גם פרומפט אחד יכול לחשוף פרט שיישמר לכל השיפורים הבאים
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-(--text-muted)">
              <span className="font-mono">{facts.length}</span> מתוך 100 עובדות
            </span>
          </div>
          {grouped.map((group) => (
            <div key={group.key} className="space-y-2">
              <h3 className="text-xs font-semibold text-(--text-muted)">{group.label}</h3>
              <div className="flex flex-wrap gap-2">
                {group.items.map((fact) => (
                  <div
                    key={fact.id}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs max-w-[260px]",
                      CATEGORY_COLORS[fact.category] ?? CATEGORY_COLORS.general,
                    )}
                  >
                    <span className="truncate" title={fact.fact}>
                      {fact.fact}
                    </span>
                    {fact.source === "manual" && (
                      <span className="text-[10px] opacity-70">ידני</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(fact.id)}
                      disabled={deletingId === fact.id}
                      className="cursor-pointer -me-1 p-1.5 rounded-full opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-opacity"
                      aria-label={`מחיקת העובדה: ${fact.fact}`}
                    >
                      {deletingId === fact.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                      ) : (
                        <X className="w-3 h-3" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
