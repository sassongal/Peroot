"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-body)] p-6 font-sans rtl" dir="rtl">
      <div className="max-w-md w-full glass-card p-8 rounded-3xl border border-[var(--glass-border)] text-center space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-[var(--text-primary)]">אופס, משהו השתבש</h1>
          <p className="text-[var(--text-muted)] text-sm leading-relaxed">
            נתקלנו בשגיאה לא צפויה. שלחנו דיווח לצוות הפיתוח שלנו והם יטפלו בזה בהקדם.
          </p>
        </div>

        {error.digest && (
          <div className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--glass-bg)] py-1 px-3 rounded-full inline-block">
            Error ID: {error.digest}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 pt-4">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[var(--text-primary)] text-[var(--surface-body)] font-bold hover:opacity-80 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>לנסות שוב</span>
          </button>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-[var(--glass-border)] text-[var(--text-primary)] font-bold hover:bg-[var(--glass-bg)] transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>חזרה לבית</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
