"use client";

import { useCallback, useEffect, useState } from "react";
import { Fingerprint, Info, Loader2, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { formatAbsoluteHe } from "@/lib/dates/format";

interface Persona {
  style_tokens: string[] | null;
  personality_brief: string | null;
  preferred_format: string | null;
  last_analyzed_at: string | null;
  injection_enabled: boolean;
}

/**
 * "הסגנון שלך" (master plan 3.3).
 *
 * The persona has been steering every enhancement invisibly. Showing it is
 * half the point; the other half is that the user can correct the brief and
 * switch the whole thing off, which until now only an env var could do.
 */
export function SettingsStyleSection() {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [available, setAvailable] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [brief, setBrief] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [queued, setQueued] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/me/persona");
      if (!res.ok) throw new Error("load failed");
      const data = await res.json();
      setPersona(data.persona);
      setAvailable(data.injection_available !== false);
      setBrief(data.persona?.personality_brief ?? "");
    } catch (e) {
      logger.warn("[style] load failed", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch("/api/me/persona", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("save failed");
    const data = await res.json();
    setPersona(data.persona);
    return data.persona as Persona;
  }

  const enabled = persona?.injection_enabled ?? true;

  async function toggleInjection() {
    const next = !enabled;
    // Optimistic, with a rollback: the switch must feel like a switch.
    setPersona((p) => (p ? { ...p, injection_enabled: next } : p));
    try {
      await patch({ injection_enabled: next });
      toast.success(next ? "הסגנון שלך יוזרם לשדרוגים" : "הסגנון שלך לא יוזרם יותר");
    } catch {
      setPersona((p) => (p ? { ...p, injection_enabled: !next } : p));
      toast.error("שינוי ההעדפה נכשל");
    }
  }

  async function saveBrief() {
    if (saving) return;
    setSaving(true);
    try {
      await patch({ personality_brief: brief.trim() });
      toast.success("התיאור נשמר");
    } catch {
      toast.error("שמירת התיאור נכשלה");
    } finally {
      setSaving(false);
    }
  }

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const res = await fetch("/api/me/persona", { method: "POST" });
      if (res.status === 429) {
        toast.error("ביקשת ניתוח מחדש כמה פעמים היום, נסה שוב מחר");
        return;
      }
      if (!res.ok) throw new Error("queue failed");
      setQueued(true);
      toast.success("הניתוח נכנס לתור");
    } catch {
      toast.error("בקשת הניתוח נכשלה");
    } finally {
      setRefreshing(false);
    }
  }

  const tokens = persona?.style_tokens ?? [];
  const dirty = brief.trim() !== (persona?.personality_brief ?? "").trim();

  return (
    <section
      className="space-y-6 animate-in fade-in duration-300"
      aria-labelledby="settings-style-heading"
    >
      <header className="space-y-1">
        <h2 id="settings-style-heading" className="text-xl font-bold">
          הסגנון שלך
        </h2>
        <p className="text-sm text-(--text-muted)">
          ככה פירוט מכיר אתכם. התיאור מוזרם לכל שדרוג, כדי שהתוצאה תישמע כמוכם
        </p>
      </header>

      {!available && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-(--text-secondary) leading-relaxed">
            הזרמת הסגנון כבויה כרגע בכל הפלטפורמה. מה שמופיע כאן נשמר, אבל אינו משפיע על השדרוגים.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-(--text-muted)" aria-label="טוען" />
        </div>
      ) : !persona ? (
        <div className="text-center py-10 space-y-2">
          <Fingerprint className="w-10 h-10 text-(--text-muted) mx-auto" aria-hidden="true" />
          <p className="text-sm text-(--text-secondary)">עוד אין פרופיל סגנון</p>
          <p className="text-xs text-(--text-muted)">
            שמרו שלושה פרומפטים לספרייה, והניתוח יתחיל לבד
          </p>
        </div>
      ) : (
        <>
          {/* The opt-out */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-(--glass-border) bg-(--glass-bg) px-4 py-3">
            <div>
              <p className="text-sm font-medium text-(--text-primary)">הזרמת הסגנון לשדרוגים</p>
              <p className="text-xs text-(--text-muted) mt-0.5">
                כיבוי משאיר את הפרופיל שמור, אבל התוצאות יחזרו להיות ניטרליות
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label="הזרמת הסגנון לשדרוגים"
              onClick={toggleInjection}
              className={`relative shrink-0 w-12 h-7 rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 ${
                enabled ? "bg-amber-500" : "bg-slate-300 dark:bg-white/20"
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all motion-reduce:transition-none ${
                  enabled ? "right-1" : "right-6"
                }`}
              />
            </button>
          </div>

          {/* The brief, editable */}
          <div className="space-y-2">
            <label htmlFor="persona-brief" className="text-xs font-medium text-(--text-secondary)">
              איך פירוט מתאר אותך
            </label>
            <textarea
              id="persona-brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="עוד אין תיאור"
              dir="auto"
              className="w-full rounded-xl border border-(--glass-border) bg-(--surface-panel) px-3 py-2.5 text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/60 transition-colors leading-relaxed resize-y"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-(--text-muted) font-mono" dir="ltr">
                {brief.length} / 1000
              </span>
              <button
                type="button"
                onClick={saveBrief}
                disabled={!dirty || saving}
                className="cursor-pointer flex items-center gap-1.5 px-3 min-h-[40px] rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300 text-sm hover:bg-amber-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="w-4 h-4" aria-hidden="true" />
                )}
                שמירת התיאור
              </button>
            </div>
          </div>

          {tokens.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-(--text-muted)">סימני היכר בכתיבה שלכם</h3>
              <div className="flex flex-wrap gap-2">
                {tokens.map((token) => (
                  <span
                    key={token}
                    className="px-3 py-1.5 rounded-full border border-(--glass-border) bg-(--glass-bg) text-xs text-(--text-secondary)"
                  >
                    {token}
                  </span>
                ))}
              </div>
            </div>
          )}

          {persona.preferred_format && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-(--text-muted)">הפורמט שאתם נוטים אליו</h3>
              <p className="text-sm text-(--text-secondary) leading-relaxed">
                {persona.preferred_format}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-(--glass-border)">
            <span className="text-[11px] text-(--text-muted)">
              {queued
                ? "הניתוח בתור, התוצאה תופיע כאן בהמשך"
                : persona.last_analyzed_at
                  ? `נותח לאחרונה ב-${formatAbsoluteHe(persona.last_analyzed_at)}`
                  : "טרם נותח"}
            </span>
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="cursor-pointer self-start flex items-center gap-1.5 px-3 min-h-[40px] rounded-xl border border-(--glass-border) bg-(--surface-panel) text-sm text-(--text-primary) hover:border-amber-500/40 transition-colors disabled:opacity-40"
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
              )}
              ניתוח מחדש
            </button>
          </div>
        </>
      )}
    </section>
  );
}
