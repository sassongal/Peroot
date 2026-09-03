import { NextResponse, type NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";
import { runLanguageEval, summarizeRun } from "@/lib/eval/language-eval";

// 24 model calls plus 24 judge calls, four at a time: a few minutes.
export const maxDuration = 300;

/**
 * GET /api/cron/language-eval (weekly, vercel.json)
 *
 * Runs the language evaluation set (languages spec B6) and stores one row
 * per case in language_eval_runs. Auth: Bearer CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const authFailure = verifyCronSecret(request);
  if (authFailure) return authFailure;

  const started = Date.now();
  try {
    const { runId, results, failed } = await runLanguageEval();
    const summary = summarizeRun(results);
    logger.info("[Cron/LanguageEval] run complete", {
      runId,
      cases: results.length,
      failed,
      durationMs: Date.now() - started,
    });
    return NextResponse.json({ ok: true, runId, cases: results.length, failed, summary });
  } catch (err) {
    logger.error("[Cron/LanguageEval] run failed", err);
    return NextResponse.json({ ok: false, error: "language eval failed" }, { status: 500 });
  }
}
