"use client";

import { useCallback, useEffect, useState } from "react";
import { Megaphone, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getApiPath } from "@/lib/api-path";
import { logger } from "@/lib/logger";
import { formatDateHe } from "@/lib/dates/format";

interface Announcement {
  id: string;
  title: string;
  body: string;
  href: string | null;
  href_label: string | null;
  starts_at: string;
  ends_at: string | null;
  audience: "all" | "guests" | "users" | "pro";
  lang: "he" | "en" | "ar" | "ru";
  priority: number;
  is_active: boolean;
  created_at: string;
}

type Draft = Omit<Announcement, "id" | "created_at">;

const EMPTY: Draft = {
  title: "",
  body: "",
  href: "",
  href_label: "",
  starts_at: new Date().toISOString(),
  ends_at: null,
  audience: "all",
  lang: "he",
  priority: 0,
  is_active: true,
};

const AUDIENCES: Array<{ value: Draft["audience"]; label: string }> = [
  { value: "all", label: "כולם" },
  { value: "guests", label: "אורחים בלבד" },
  { value: "users", label: "משתמשים רשומים" },
  { value: "pro", label: "Pro בלבד" },
];

const LANGS: Array<{ value: Draft["lang"]; label: string }> = [
  { value: "he", label: "עברית" },
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
  { value: "ru", label: "Русский" },
];

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

/**
 * The "מה חדש" editor. One line on the home page comes from the highest
 * priority live row here; the public /whats-new page lists them all.
 */
export function AnnouncementsTab() {
  const [rows, setRows] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<(Draft & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiPath("/api/admin/announcements"), {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { announcements: Announcement[] };
      setRows(data.announcements);
    } catch (err) {
      logger.error("[AnnouncementsTab] load failed", err);
      toast.error("טעינת ההודעות נכשלה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload = {
        ...editing,
        href: editing.href?.trim() ? editing.href.trim() : null,
        href_label: editing.href_label?.trim() ? editing.href_label.trim() : null,
      };
      const res = await fetch(getApiPath("/api/admin/announcements"), {
        method: editing.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      toast.success(editing.id ? "ההודעה עודכנה" : "ההודעה נוצרה");
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "השמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: Announcement) => {
    const res = await fetch(getApiPath("/api/admin/announcements"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id: row.id, is_active: !row.is_active }),
    });
    if (!res.ok) {
      toast.error("העדכון נכשל");
      return;
    }
    await load();
  };

  const remove = async (row: Announcement) => {
    if (!window.confirm(`למחוק את "${row.title}"?`)) return;
    const res = await fetch(getApiPath(`/api/admin/announcements?id=${row.id}`), {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!res.ok) {
      toast.error("המחיקה נכשלה");
      return;
    }
    toast.success("ההודעה נמחקה");
    await load();
  };

  const isLive = (row: Announcement) => {
    const now = Date.now();
    return (
      row.is_active &&
      new Date(row.starts_at).getTime() <= now &&
      (!row.ends_at || new Date(row.ends_at).getTime() > now)
    );
  };

  const field =
    "w-full rounded-lg border border-(--glass-border) bg-(--surface-panel) text-(--text-primary) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40";

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-(--text-primary) flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-amber-500" aria-hidden="true" />
            מה חדש
          </h2>
          <p className="text-sm text-(--text-muted) mt-1">
            השורה שמתחת ל&quot;הידעת?&quot; בדף הבית מציגה את ההודעה הפעילה בעדיפות הגבוהה ביותר. כל
            ההודעות הפעילות מופיעות בדף /whats-new.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="p-2 rounded-lg text-(--text-muted) hover:text-(--text-primary) hover:bg-(--glass-bg)"
            aria-label="רענן"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <button
            type="button"
            onClick={() => setEditing({ ...EMPTY, starts_at: new Date().toISOString() })}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            הודעה חדשה
          </button>
        </div>
      </div>

      {editing ? (
        <div className="rounded-xl border border-(--glass-border) bg-(--glass-bg) p-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-(--text-muted) md:col-span-2">
              כותרת
              <input
                className={cn(field, "mt-1")}
                value={editing.title}
                maxLength={140}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </label>
            <label className="text-xs text-(--text-muted) md:col-span-2">
              גוף (משפט אחד)
              <textarea
                className={cn(field, "mt-1 min-h-[72px]")}
                value={editing.body}
                maxLength={400}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
              />
            </label>
            <label className="text-xs text-(--text-muted)">
              קישור (אופציונלי)
              <input
                className={cn(field, "mt-1")}
                dir="ltr"
                value={editing.href ?? ""}
                onChange={(e) => setEditing({ ...editing, href: e.target.value })}
                placeholder="/whats-new"
              />
            </label>
            <label className="text-xs text-(--text-muted)">
              טקסט הקישור
              <input
                className={cn(field, "mt-1")}
                value={editing.href_label ?? ""}
                maxLength={40}
                onChange={(e) => setEditing({ ...editing, href_label: e.target.value })}
                placeholder="לפרטים"
              />
            </label>
            <label className="text-xs text-(--text-muted)">
              מתחיל
              <input
                type="datetime-local"
                className={cn(field, "mt-1")}
                dir="ltr"
                value={toLocalInput(editing.starts_at)}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    starts_at: fromLocalInput(e.target.value) ?? new Date().toISOString(),
                  })
                }
              />
            </label>
            <label className="text-xs text-(--text-muted)">
              מסתיים (ריק = ללא סיום)
              <input
                type="datetime-local"
                className={cn(field, "mt-1")}
                dir="ltr"
                value={toLocalInput(editing.ends_at)}
                onChange={(e) =>
                  setEditing({ ...editing, ends_at: fromLocalInput(e.target.value) })
                }
              />
            </label>
            <label className="text-xs text-(--text-muted)">
              קהל
              <select
                className={cn(field, "mt-1")}
                value={editing.audience}
                onChange={(e) =>
                  setEditing({ ...editing, audience: e.target.value as Draft["audience"] })
                }
              >
                {AUDIENCES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-(--text-muted)">
              שפה
              <select
                className={cn(field, "mt-1")}
                value={editing.lang}
                onChange={(e) => setEditing({ ...editing, lang: e.target.value as Draft["lang"] })}
              >
                {LANGS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-(--text-muted)">
              עדיפות (גבוה יותר מוצג קודם)
              <input
                type="number"
                className={cn(field, "mt-1")}
                dir="ltr"
                value={editing.priority}
                min={-100}
                max={100}
                onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) || 0 })}
              />
            </label>
            <label className="text-xs text-(--text-muted) flex items-center gap-2 mt-5">
              <input
                type="checkbox"
                checked={editing.is_active}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
              />
              פעילה
            </label>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-(--text-muted) hover:bg-(--glass-bg)"
            >
              <X className="w-4 h-4" aria-hidden="true" />
              ביטול
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || editing.title.trim().length < 2}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 disabled:opacity-50"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              {saving ? "שומר..." : "שמור"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-(--glass-border) overflow-hidden">
        {loading && rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-(--text-muted)">טוען...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-(--text-muted)">אין הודעות עדיין.</div>
        ) : (
          <ul className="divide-y divide-(--glass-border)">
            {rows.map((row) => (
              <li key={row.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        isLive(row)
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : "bg-slate-500/15 text-(--text-muted)",
                      )}
                    >
                      {isLive(row) ? "חי" : row.is_active ? "מתוזמנת / הסתיימה" : "כבויה"}
                    </span>
                    <span className="text-[10px] text-(--text-muted)">
                      {LANGS.find((l) => l.value === row.lang)?.label} ·{" "}
                      {AUDIENCES.find((a) => a.value === row.audience)?.label} · עדיפות{" "}
                      {row.priority}
                    </span>
                  </div>
                  <p className="font-semibold text-(--text-primary) mt-1 truncate">{row.title}</p>
                  {row.body ? (
                    <p className="text-sm text-(--text-secondary) line-clamp-2">{row.body}</p>
                  ) : null}
                  <p className="text-[11px] text-(--text-muted) mt-1">
                    מ-{formatDateHe(row.starts_at)}
                    {row.ends_at ? ` עד ${formatDateHe(row.ends_at)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        id: row.id,
                        title: row.title,
                        body: row.body,
                        href: row.href ?? "",
                        href_label: row.href_label ?? "",
                        starts_at: row.starts_at,
                        ends_at: row.ends_at,
                        audience: row.audience,
                        lang: row.lang,
                        priority: row.priority,
                        is_active: row.is_active,
                      })
                    }
                    className="px-3 py-1.5 rounded-lg text-sm text-(--text-secondary) hover:bg-(--glass-bg)"
                  >
                    עריכה
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleActive(row)}
                    className="px-3 py-1.5 rounded-lg text-sm text-(--text-secondary) hover:bg-(--glass-bg)"
                  >
                    {row.is_active ? "כבה" : "הפעל"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(row)}
                    className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10"
                    aria-label="מחק"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
