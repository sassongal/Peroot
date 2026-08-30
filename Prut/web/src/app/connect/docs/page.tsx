import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, KeyRound, Terminal } from "lucide-react";
import { CONNECT_OPENAPI } from "@/lib/connect/openapi";

export const metadata: Metadata = {
  title: "Peroot Connect — תיעוד API",
  description:
    "התיעוד המלא של Peroot Connect API: אימות, כל נקודות הקצה, קודי שגיאה, מכסות ודוגמאות — לחיבור כל סוכן AI ל-Peroot.",
};

/** Method badge color per HTTP verb. */
const METHOD_STYLE: Record<string, string> = {
  get: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  post: "bg-sky-500/15 text-sky-300 border-sky-500/30",
};

const ERROR_ROWS: Array<[string, string, string]> = [
  ["401 invalid_key", "מפתח חסר/שגוי/מבוטל", "צור מפתח חדש ב-Settings → Peroot Connect"],
  [
    "402 no_credits",
    "המכסה נגמרה (חינמי 1/יום · PRO 150/חודש)",
    "המתן ל-quota_resets_at או שדרג ל-PRO",
  ],
  ["429 rate_limited", "מעל 20/דקה למפתח או 40/דקה למשתמש", "כבד את Retry-After"],
  ["400 invalid_request", "קלט לא תקין (mode לא מוכר, prompt ארוך מדי…)", "בדוק מול הסכמה"],
  ["504 timeout", "השדרוג עבר 55 שניות", "הקרדיט הוחזר אוטומטית — נסה שוב"],
];

/**
 * Peroot Connect DOCS — rendered directly from the OpenAPI object
 * (single source of truth; can never drift from /api/v1/openapi).
 */
export default function ConnectDocsPage() {
  const paths = CONNECT_OPENAPI.paths as Record<
    string,
    Record<string, { summary?: string; description?: string }>
  >;

  return (
    <main dir="rtl" className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-3xl mx-auto px-4 py-14 space-y-12">
        <header className="space-y-3">
          <Link
            href="/connect"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            חזרה ל-Peroot Connect
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-amber-400" />
            תיעוד ה-API
          </h1>
          <p className="text-slate-400 text-sm">{CONNECT_OPENAPI.info.description}</p>
          <p className="text-xs text-slate-500" dir="ltr">
            OpenAPI:{" "}
            <a href="/api/v1/openapi" className="text-amber-400/80 hover:text-amber-300 font-mono">
              /api/v1/openapi
            </a>
            {" · "}Base URL: <code className="font-mono">{CONNECT_OPENAPI.servers[0].url}</code>
          </p>
        </header>

        {/* Auth */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-400" />
            אימות
          </h2>
          <p className="text-sm text-slate-400">
            כל בקשה נושאת את המפתח שלך (נוצר ב-
            <Link href="/settings?tab=connect" className="text-amber-400/80 hover:text-amber-300">
              Settings → Peroot Connect
            </Link>
            ) בכותרת Authorization:
          </p>
          <pre
            dir="ltr"
            className="p-4 bg-black/40 rounded-xl border border-white/10 font-mono text-xs text-slate-300 overflow-x-auto"
          >
            {"Authorization: Bearer prk_live_XXXX"}
          </pre>
        </section>

        {/* Endpoints — generated from the spec */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Terminal className="w-5 h-5 text-amber-400" />
            נקודות הקצה
          </h2>
          <ul className="space-y-3">
            {Object.entries(paths).map(([path, methods]) =>
              Object.entries(methods).map(([method, op]) => (
                <li
                  key={`${method} ${path}`}
                  className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-1.5"
                >
                  <div className="flex items-center gap-2 flex-wrap" dir="ltr">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase border ${METHOD_STYLE[method] ?? "bg-white/10 text-slate-300 border-white/10"}`}
                    >
                      {method}
                    </span>
                    <code className="font-mono text-sm text-slate-200">{path}</code>
                  </div>
                  <p className="text-sm text-slate-300">{op.summary}</p>
                  {op.description && <p className="text-xs text-slate-500">{op.description}</p>}
                </li>
              )),
            )}
          </ul>
          <p className="text-xs text-slate-500">
            סכמות מלאות (שדות, גבולות, enums) — ב-OpenAPI. סוכני MCP מקבלים את אותן יכולות ככלים דרך{" "}
            <code dir="ltr" className="font-mono">
              https://www.peroot.space/api/mcp
            </code>
            .
          </p>
        </section>

        {/* Errors */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">קודי שגיאה</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-slate-500 text-xs border-b border-white/10">
                  <th className="py-2 pl-4 font-medium">קוד</th>
                  <th className="py-2 pl-4 font-medium">מתי</th>
                  <th className="py-2 font-medium">מה לעשות</th>
                </tr>
              </thead>
              <tbody>
                {ERROR_ROWS.map(([code, when, what]) => (
                  <tr key={code} className="border-b border-white/5">
                    <td className="py-2.5 pl-4">
                      <code dir="ltr" className="font-mono text-xs text-amber-300">
                        {code}
                      </code>
                    </td>
                    <td className="py-2.5 pl-4 text-slate-300">{when}</td>
                    <td className="py-2.5 text-slate-400 text-xs">{what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">
            כל שגיאה חוזרת כ-
            <code dir="ltr" className="font-mono">
              {"{ error, error_en, code }"}
            </code>{" "}
            — עברית + אנגלית, כדי שהסוכן יסביר למשתמש בשפתו.
          </p>
        </section>

        {/* Tips */}
        <section className="space-y-3 p-5 bg-white/5 rounded-xl border border-white/10">
          <h2 className="text-lg font-bold">שלושה טיפים לחיבור מצוין</h2>
          <ul className="text-sm text-slate-300 space-y-2 list-disc pr-5">
            <li>
              <b>העבירו הקשר.</b> פרמטר{" "}
              <code dir="ltr" className="font-mono">
                context
              </code>{" "}
              (תמצית קצרה של הפרויקט/השיחה) הופך שדרוג גנרי לשדרוג מקורקע במה שאתם באמת עובדים עליו.
            </li>
            <li>
              <b>בדקו מכסה לפני.</b>{" "}
              <code dir="ltr" className="font-mono">
                GET /quota
              </code>{" "}
              חינמי — במסלול החינמי (1/יום) שווה לבדוק לפני ששורפים את הקריאה.
            </li>
            <li>
              <b>השתמשו ב-Idempotency-Key.</b> retry של רשת לא יחייב אתכם פעמיים.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
