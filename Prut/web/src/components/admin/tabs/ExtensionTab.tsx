"use client";

import { useCallback, useEffect, useState } from "react";
import { Chrome, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getApiPath } from "@/lib/api-path";
import { logger } from "@/lib/logger";
import { formatDateHe } from "@/lib/dates/format";

interface Summary {
  totals: Record<string, number>;
  days: Array<{ day: string; events: Record<string, number> }>;
  selectorMisses: Array<{ site: string; kind: string; count: number }>;
  versions: Array<{ version: string; count: number }>;
  activeUsers7d: number;
  latest: Array<{
    event: string;
    site: string | null;
    ext_version: string | null;
    target_model: string | null;
    meta: Record<string, unknown> | null;
    created_at: string;
  }>;
}

const EVENT_LABELS: Record<string, string> = {
  selector_miss: "שדה לא נמצא",
  popup_enhance: "שדרוג מהחלון",
  score_gate_hit: "כבר חזק, בלי AI",
  cache_hit: "מטמון",
  chip_click: "לחיצה על צ'יפ",
  quicklib_open: "ספרייה נפתחה",
  quicklib_insert: "הוכנס מהספרייה",
};

/**
 * "תוסף": what the Chrome extension reports back. The one number to watch
 * is selector misses per site: when ChatGPT, Claude or Gemini change their
 * markup, that row grows before anyone writes in.
 */
export function ExtensionTab() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiPath("/api/admin/extension-telemetry"), {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as Summary);
    } catch (err) {
      logger.error("[ExtensionTab] load failed", err);
      toast.error("טעינת הטלמטריה נכשלה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalEvents = data ? Object.values(data.totals).reduce((s, n) => s + n, 0) : 0;
  const missTotal = data?.totals.selector_miss ?? 0;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-(--text-primary) flex items-center gap-2">
            <Chrome className="w-5 h-5 text-amber-500" aria-hidden="true" />
            תוסף Chrome
          </h2>
          <p className="text-sm text-(--text-muted) mt-1">
            אירועים מהתוסף ב-14 הימים האחרונים. השורה שחשובה היא שדה לא נמצא, לפי אתר. כשהיא עולה,
            אתר שיחה שינה את המבנה שלו, וצריך לעדכן את הסלקטורים באינטגרציות.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="p-2 rounded-lg text-(--text-muted) hover:text-(--text-primary) hover:bg-(--glass-bg)"
          aria-label="רענן"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {loading && !data ? (
        <p className="text-sm text-(--text-muted)">טוען...</p>
      ) : !data || totalEvents === 0 ? (
        <div className="rounded-xl border border-(--glass-border) bg-(--glass-bg) p-5 text-sm text-(--text-muted)">
          עוד לא הגיעו אירועים. התוסף מדווח מהרגע שמישהו מתקין אותו ומשדרג.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "אירועים", value: totalEvents },
              { label: "פעילים ב-7 ימים", value: data.activeUsers7d },
              { label: "שדרוגים מהחלון", value: data.totals.popup_enhance ?? 0 },
              { label: "שדה לא נמצא", value: missTotal, warn: missTotal > 0 },
            ].map((t) => (
              <div
                key={t.label}
                className={cn(
                  "p-4 rounded-xl border bg-(--glass-bg) text-center",
                  t.warn ? "border-red-500/40" : "border-(--glass-border)",
                )}
              >
                <p
                  className={cn(
                    "text-2xl font-bold font-mono",
                    t.warn ? "text-red-600 dark:text-red-400" : "text-(--text-primary)",
                  )}
                >
                  {t.value}
                </p>
                <p className="text-xs text-(--text-muted)">{t.label}</p>
              </div>
            ))}
          </div>

          {data.selectorMisses.length > 0 ? (
            <div className="rounded-xl border border-(--glass-border) overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="text-start text-xs text-(--text-muted) p-3">
                  שדות שלא נמצאו, לפי אתר
                </caption>
                <thead className="text-xs text-(--text-muted) bg-(--glass-bg)">
                  <tr>
                    <th className="text-start p-3 font-medium">אתר</th>
                    <th className="text-start p-3 font-medium">שדה</th>
                    <th className="p-3 font-medium">פעמים</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--glass-border)">
                  {data.selectorMisses.map((m) => (
                    <tr key={`${m.site}-${m.kind}`}>
                      <td className="p-3 font-semibold text-(--text-primary)">{m.site}</td>
                      <td className="p-3 font-mono text-(--text-secondary)">{m.kind}</td>
                      <td className="p-3 text-center font-mono text-red-600 dark:text-red-400">
                        {m.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-(--glass-border) overflow-x-auto">
              <table className="w-full text-xs">
                <caption className="text-start text-xs text-(--text-muted) p-3">
                  אירועים לפי יום
                </caption>
                <thead className="text-(--text-muted) bg-(--glass-bg)">
                  <tr>
                    <th className="text-start p-2 font-medium">יום</th>
                    <th className="p-2 font-medium">שדרוגים</th>
                    <th className="p-2 font-medium">לא נמצא</th>
                    <th className="p-2 font-medium">הכול</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--glass-border)">
                  {data.days.slice(-14).map((d) => (
                    <tr key={d.day}>
                      <td className="p-2">{formatDateHe(d.day)}</td>
                      <td className="p-2 text-center font-mono">{d.events.popup_enhance ?? 0}</td>
                      <td className="p-2 text-center font-mono">{d.events.selector_miss ?? 0}</td>
                      <td className="p-2 text-center font-mono">
                        {Object.values(d.events).reduce((s, n) => s + n, 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-xl border border-(--glass-border) overflow-x-auto">
              <table className="w-full text-xs">
                <caption className="text-start text-xs text-(--text-muted) p-3">
                  גרסאות בשטח
                </caption>
                <thead className="text-(--text-muted) bg-(--glass-bg)">
                  <tr>
                    <th className="text-start p-2 font-medium">גרסה</th>
                    <th className="p-2 font-medium">אירועים</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--glass-border)">
                  {data.versions.map((v) => (
                    <tr key={v.version}>
                      <td className="p-2 font-mono">{v.version}</td>
                      <td className="p-2 text-center font-mono">{v.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-(--text-primary)">האירועים האחרונים</h3>
            <ul className="space-y-1.5">
              {data.latest.map((e, i) => (
                <li
                  key={`${e.created_at}-${i}`}
                  className="flex items-center gap-3 flex-wrap text-xs rounded-lg border border-(--glass-border) bg-(--glass-bg) px-3 py-2"
                >
                  <span className="font-semibold text-(--text-primary)">
                    {EVENT_LABELS[e.event] ?? e.event}
                  </span>
                  {e.site ? <span className="text-(--text-secondary)">{e.site}</span> : null}
                  {e.target_model ? (
                    <span className="font-mono text-(--text-muted)">{e.target_model}</span>
                  ) : null}
                  {e.ext_version ? (
                    <span className="font-mono text-(--text-muted)">v{e.ext_version}</span>
                  ) : null}
                  <span className="text-(--text-muted) ms-auto">{formatDateHe(e.created_at)}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
