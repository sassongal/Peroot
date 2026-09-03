"use client";

import { useCallback, useEffect, useState } from "react";
import { Languages, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getApiPath } from "@/lib/api-path";
import { logger } from "@/lib/logger";
import { formatDateHe } from "@/lib/dates/format";
import { outputLanguageDef, type OutputLanguage } from "@/lib/output-language";
import type { LanguageSummary } from "@/lib/eval/language-eval";

interface RunRow {
  run_id: string;
  ran_at: string;
  cases: number;
  summary: LanguageSummary[];
}

interface WeakCase {
  case_key: string;
  language: OutputLanguage;
  language_ok: boolean;
  fluency: number;
  intent: number;
  structure: number;
  scorer_total: number;
  dashes: number;
  judge_notes: string;
  output_sample: string;
  model_id: string;
}

/**
 * "שפות": the language evaluation trend (languages spec B6). One row per
 * language for the latest run, the previous runs beneath, and the weakest
 * cases with their judge note and a sample, so a regression in Arabic or
 * Russian is a number on this page and not a user's complaint.
 */
export function LanguageEvalTab() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [weakest, setWeakest] = useState<WeakCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiPath("/api/admin/language-eval"), {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { runs: RunRow[]; weakest: WeakCase[] };
      setRuns(data.runs);
      setWeakest(data.weakest);
    } catch (err) {
      logger.error("[LanguageEvalTab] load failed", err);
      toast.error("טעינת ההערכות נכשלה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runNow = async () => {
    setRunning(true);
    toast.message("מריץ 24 מקרים, זה לוקח כמה דקות");
    try {
      const res = await fetch(getApiPath("/api/admin/language-eval"), {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { cases: number; failed: string[] };
      toast.success(
        `הסתיים: ${data.cases} מקרים${data.failed.length ? `, ${data.failed.length} נכשלו` : ""}`,
      );
      await load();
    } catch (err) {
      logger.error("[LanguageEvalTab] run failed", err);
      toast.error("ההרצה נכשלה");
    } finally {
      setRunning(false);
    }
  };

  const latest = runs[0];
  const hebrew = latest?.summary.find((s) => s.language === "hebrew");

  // Spec B6 acceptance: judge within 0.5 of Hebrew, scorer within 5.
  const gap = (s: LanguageSummary) => {
    if (!hebrew || s.language === "hebrew") return null;
    const judge = (s.fluency + s.intent + s.structure) / 3;
    const judgeHe = (hebrew.fluency + hebrew.intent + hebrew.structure) / 3;
    return {
      judge: Math.round((judge - judgeHe) * 100) / 100,
      scorer: Math.round(s.scorer_total - hebrew.scorer_total),
      ok: judgeHe - judge <= 0.5 && hebrew.scorer_total - s.scorer_total <= 5,
    };
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-(--text-primary) flex items-center gap-2">
            <Languages className="w-5 h-5 text-amber-500" aria-hidden="true" />
            שפות
          </h2>
          <p className="text-sm text-(--text-muted) mt-1">
            שישה מקרים בארבע שפות דרך המנוע האמיתי, נמדדים בשופט-AI (שטף, נאמנות, מבנה) ובמדרג של
            פירוט. רץ אוטומטית בראשון לכל חודש. היעד: ערבית ורוסית בטווח 0.5 מעברית בשופט ו-5 במדרג.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
            onClick={() => void runNow()}
            disabled={running}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 disabled:opacity-50"
          >
            <Play className="w-4 h-4" aria-hidden="true" />
            {running ? "מריץ..." : "הרץ עכשיו"}
          </button>
        </div>
      </div>

      {loading && runs.length === 0 ? (
        <p className="text-sm text-(--text-muted)">טוען...</p>
      ) : !latest ? (
        <p className="text-sm text-(--text-muted)">עדיין לא רצה הערכה. לחצו על הרץ עכשיו.</p>
      ) : (
        <>
          <div className="rounded-xl border border-(--glass-border) overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="text-start text-xs text-(--text-muted) p-3">
                הריצה האחרונה, {formatDateHe(latest.ran_at)}, {latest.cases} מקרים
              </caption>
              <thead className="text-xs text-(--text-muted) bg-(--glass-bg)">
                <tr>
                  <th className="text-start p-3 font-medium">שפה</th>
                  <th className="p-3 font-medium">שפה נכונה</th>
                  <th className="p-3 font-medium">שטף</th>
                  <th className="p-3 font-medium">נאמנות</th>
                  <th className="p-3 font-medium">מבנה</th>
                  <th className="p-3 font-medium">מדרג</th>
                  <th className="p-3 font-medium">מקפים</th>
                  <th className="p-3 font-medium">מול עברית</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--glass-border)">
                {latest.summary.map((s) => {
                  const g = gap(s);
                  return (
                    <tr key={s.language}>
                      <td className="p-3 font-semibold text-(--text-primary)">
                        {outputLanguageDef(s.language).native}
                      </td>
                      <td
                        className={cn(
                          "p-3 text-center font-mono",
                          s.language_ok_pct < 100 && "text-red-500",
                        )}
                      >
                        {s.language_ok_pct}%
                      </td>
                      <td className="p-3 text-center font-mono">{s.fluency}</td>
                      <td className="p-3 text-center font-mono">{s.intent}</td>
                      <td className="p-3 text-center font-mono">{s.structure}</td>
                      <td className="p-3 text-center font-mono">{s.scorer_total}</td>
                      <td
                        className={cn("p-3 text-center font-mono", s.dashes > 0 && "text-red-500")}
                      >
                        {s.dashes}
                      </td>
                      <td className="p-3 text-center">
                        {g ? (
                          <span
                            className={cn(
                              "text-[11px] font-bold px-2 py-0.5 rounded-full",
                              g.ok
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : "bg-red-500/15 text-red-600 dark:text-red-300",
                            )}
                          >
                            {g.ok ? "בטווח" : "מחוץ לטווח"} ({g.judge >= 0 ? "+" : ""}
                            {g.judge} / {g.scorer >= 0 ? "+" : ""}
                            {g.scorer})
                          </span>
                        ) : (
                          <span className="text-(--text-muted)">בסיס</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {runs.length > 1 ? (
            <div className="rounded-xl border border-(--glass-border) overflow-x-auto">
              <table className="w-full text-xs">
                <caption className="text-start text-xs text-(--text-muted) p-3">
                  ריצות קודמות (ממוצע השופט 1-5 לכל שפה)
                </caption>
                <thead className="text-(--text-muted) bg-(--glass-bg)">
                  <tr>
                    <th className="text-start p-2 font-medium">תאריך</th>
                    {latest.summary.map((s) => (
                      <th key={s.language} className="p-2 font-medium">
                        {outputLanguageDef(s.language).native}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--glass-border)">
                  {runs.slice(1, 8).map((run) => (
                    <tr key={run.run_id}>
                      <td className="p-2">{formatDateHe(run.ran_at)}</td>
                      {run.summary.map((s) => (
                        <td key={s.language} className="p-2 text-center font-mono">
                          {s.cases
                            ? Math.round(((s.fluency + s.intent + s.structure) / 3) * 10) / 10
                            : "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {weakest.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-(--text-primary)">
                המקרים החלשים בריצה האחרונה
              </h3>
              <ul className="space-y-2">
                {weakest.map((w) => (
                  <li
                    key={`${w.case_key}-${w.language}`}
                    className="rounded-xl border border-(--glass-border) bg-(--glass-bg) p-3 text-sm"
                  >
                    <div className="flex items-center gap-2 flex-wrap text-xs text-(--text-muted)">
                      <span className="font-semibold text-(--text-primary)">
                        {outputLanguageDef(w.language).native}
                      </span>
                      <span>{w.case_key}</span>
                      <span>{w.model_id}</span>
                      <span className={cn(!w.language_ok && "text-red-500 font-bold")}>
                        {w.language_ok ? "שפה נכונה" : "שפה שגויה"}
                      </span>
                      <span className="font-mono">
                        {w.fluency}/{w.intent}/{w.structure}, מדרג {w.scorer_total}
                        {w.dashes ? `, ${w.dashes} מקפים` : ""}
                      </span>
                    </div>
                    {w.judge_notes ? (
                      <p className="text-(--text-secondary) mt-1" dir="ltr">
                        {w.judge_notes}
                      </p>
                    ) : null}
                    <pre
                      className="mt-2 text-[11px] whitespace-pre-wrap text-(--text-muted) max-h-32 overflow-auto"
                      dir={outputLanguageDef(w.language).dir}
                      lang={outputLanguageDef(w.language).tag}
                    >
                      {w.output_sample}
                    </pre>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
