import { NextResponse } from "next/server";
import { withAdmin, withAdminWrite } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import { runLanguageEval, summarizeRun, type EvalResult } from "@/lib/eval/language-eval";

export const maxDuration = 300;

type Row = EvalResult & { run_id: string; ran_at: string };

/**
 * GET  /api/admin/language-eval  the last runs, summarized per language,
 *                                plus the weakest cases of the latest run.
 * POST /api/admin/language-eval  run the set now (a few minutes).
 */
export const GET = withAdmin(async (_req, supabase) => {
  const { data, error } = await supabase
    .from("language_eval_runs")
    .select("*")
    .order("ran_at", { ascending: false })
    .limit(24 * 8);
  if (error) {
    logger.error("[admin/language-eval] list failed", error);
    return NextResponse.json({ error: "טעינת ההערכות נכשלה" }, { status: 500 });
  }
  const rows = (data ?? []) as Row[];
  const byRun = new Map<string, Row[]>();
  for (const r of rows) {
    const list = byRun.get(r.run_id) ?? [];
    list.push(r);
    byRun.set(r.run_id, list);
  }
  const runs = [...byRun.entries()]
    .map(([run_id, list]) => ({
      run_id,
      ran_at: list.reduce((m, r) => (r.ran_at < m ? r.ran_at : m), list[0].ran_at),
      cases: list.length,
      summary: summarizeRun(list),
    }))
    .sort((a, b) => (a.ran_at < b.ran_at ? 1 : -1));
  const latest = runs[0] ? (byRun.get(runs[0].run_id) ?? []) : [];
  const weakest = [...latest]
    .sort(
      (a, b) =>
        Number(a.language_ok) - Number(b.language_ok) ||
        a.fluency + a.intent + a.structure - (b.fluency + b.intent + b.structure),
    )
    .slice(0, 6)
    .map((r) => ({
      case_key: r.case_key,
      language: r.language,
      language_ok: r.language_ok,
      fluency: r.fluency,
      intent: r.intent,
      structure: r.structure,
      scorer_total: r.scorer_total,
      dashes: r.dashes,
      judge_notes: r.judge_notes,
      output_sample: r.output_sample.slice(0, 400),
      model_id: r.model_id,
    }));
  return NextResponse.json({ runs, weakest });
});

export const POST = withAdminWrite(async () => {
  try {
    const { runId, results, failed } = await runLanguageEval();
    return NextResponse.json({
      ok: true,
      runId,
      cases: results.length,
      failed,
      summary: summarizeRun(results),
    });
  } catch (err) {
    logger.error("[admin/language-eval] run failed", err);
    return NextResponse.json({ error: "ההרצה נכשלה" }, { status: 500 });
  }
});
