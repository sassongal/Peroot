"use client";

import { useState } from "react";
import { Brain, X, Plus, Loader2, Info } from "lucide-react";
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

const CATEGORY_COLORS: Record<string, string> = {
  professional: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  personal: "border-green-500/30 bg-green-500/10 text-green-300",
  preference: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  project: "border-purple-500/30 bg-purple-500/10 text-purple-300",
  language: "border-pink-500/30 bg-pink-500/10 text-pink-300",
  general: "border-slate-500/30 bg-slate-500/10 text-slate-300",
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
    }
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteFact(id);
    setDeletingId(null);
  };

  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    items: facts.filter((f) => f.category === cat.key),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          זיכרון AI
        </h2>
        <p className="text-sm text-slate-400 mt-1 leading-relaxed">
          עובדות שה-AI יודע עליך — מוחלות אוטומטית על כל שיפור פרומפט החל מהפרומפט הראשון.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2.5 rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-3">
        <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed">
          הזיכרון נבנה אוטומטית מהפרומפטים שאתה כותב. ניתן להוסיף עובדות ידנית או למחוק עובדות שאינן
          מדויקות. מקסימום 100 עובדות.
        </p>
      </div>

      {/* Manual add */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-400">הוסף עובדה ידנית</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={newFact}
            onChange={(e) => setNewFact(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="למשל: מנהל מוצר ב-B2B SaaS"
            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/60 transition-colors"
            maxLength={300}
          />
          <div className="flex gap-2">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="flex-1 sm:flex-none sm:min-w-[110px] bg-black/40 border border-white/10 rounded-lg px-2 py-2 text-sm text-slate-300 focus:outline-none focus:border-purple-500/60 transition-colors cursor-pointer"
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              disabled={!newFact.trim() || isAdding || facts.length >= 100}
              className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isAdding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              הוסף
            </button>
          </div>
        </div>
      </div>

      {/* Facts list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
        </div>
      ) : facts.length === 0 ? (
        <div className="text-center py-10 space-y-2">
          <Brain className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm text-slate-400">AI ילמד עליך בהדרגה תוך כדי שימוש</p>
          <p className="text-xs text-slate-500">
            גם פרומפט אחד יכול לחשוף מידע שישתמר לכל השיפורים הבאים
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{facts.length} / 100 עובדות</span>
          </div>
          {grouped.map((group) => (
            <div key={group.key} className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {group.label}
              </h3>
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
                      <span className="text-[9px] opacity-60">ידני</span>
                    )}
                    <button
                      onClick={() => handleDelete(fact.id)}
                      disabled={deletingId === fact.id}
                      className="cursor-pointer opacity-50 hover:opacity-100 transition-opacity ml-0.5"
                      aria-label="מחק עובדה"
                    >
                      {deletingId === fact.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
