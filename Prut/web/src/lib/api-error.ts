import { NextResponse } from "next/server";

/**
 * Canonical API error shapes for Peroot.
 *
 * Convention (Hebrew-first app): a Hebrew user-facing message in `error` and a
 * stable snake_case machine code in `code`. Used internally by `withUser`
 * (src/lib/api-middleware.ts) and available to route handlers for their own
 * domain errors so the API surface speaks one error vocabulary.
 */

interface ApiErrorOptions {
  status: number;
  error: string;
  code: string;
  /** Extra fields merged into the JSON body (e.g. `{ balance }`, `{ reset_at }`). */
  extra?: Record<string, unknown>;
  headers?: HeadersInit;
}

export function apiError({ status, error, code, extra, headers }: ApiErrorOptions) {
  return NextResponse.json({ error, code, ...extra }, { status, headers });
}

export const errors = {
  /** 401 — no authenticated session. */
  unauthorized: (message = "נדרשת התחברות") =>
    apiError({ status: 401, error: message, code: "auth_required" }),

  /** 401 — a Bearer token was supplied but is invalid/expired/unaudienced. */
  invalidToken: (message = "טוקן אימות לא תקין או פג תוקף") =>
    apiError({ status: 401, error: message, code: "invalid_token" }),

  /** 403 — authenticated but not permitted. */
  forbidden: (message = "אין הרשאה לפעולה זו") =>
    apiError({ status: 403, error: message, code: "forbidden" }),

  /** 404 — resource missing. */
  notFound: (resource = "המשאב", message?: string) =>
    apiError({ status: 404, error: message ?? `${resource} לא נמצא`, code: "not_found" }),

  /** 400 — malformed request; pass a specific message and optional code. */
  badRequest: (message: string, code = "bad_request") =>
    apiError({ status: 400, error: message, code }),

  /** 402 — insufficient credits; carries the current balance. */
  insufficientCredits: (balance: number, message = "אין מספיק קרדיטים") =>
    apiError({ status: 402, error: message, code: "insufficient_credits", extra: { balance } }),

  /** 429 — rate limited; sets Retry-After and echoes the reset epoch. */
  rateLimited: (
    opts: { reset?: number; limit?: number; remaining?: number; message?: string } = {},
  ) => {
    const { reset, limit, remaining, message = "חרגת ממגבלת הבקשות. נסה שוב מאוחר יותר" } = opts;
    const headers: Record<string, string> = {};
    if (reset !== undefined) {
      headers["Retry-After"] = String(reset);
      headers["X-RateLimit-Reset"] = String(reset);
    }
    if (limit !== undefined) headers["X-RateLimit-Limit"] = String(limit);
    if (remaining !== undefined) headers["X-RateLimit-Remaining"] = String(remaining);
    return apiError({
      status: 429,
      error: message,
      code: "rate_limited",
      extra: reset !== undefined ? { reset_at: reset } : undefined,
      headers,
    });
  },

  /** 500 — unexpected server error. */
  internal: (message = "שגיאת שרת פנימית") =>
    apiError({ status: 500, error: message, code: "server_error" }),
} as const;
