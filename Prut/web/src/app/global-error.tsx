"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
        <div className="max-w-md w-full bg-zinc-900 border border-white/10 p-8 rounded-3xl text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-3xl">
            !
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">שגיאה קריטית</h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              נתקלנו בשגיאה לא צפויה. נא לנסות שוב או לחזור מאוחר יותר.
            </p>
          </div>
          {error.digest && (
            <div className="text-[10px] font-mono text-zinc-600 bg-white/5 py-1 px-3 rounded-full inline-block">
              Error ID: {error.digest}
            </div>
          )}
          <button
            onClick={() => reset()}
            className="px-6 py-3 rounded-2xl bg-white text-zinc-950 font-bold hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            נסה שוב
          </button>
        </div>
      </body>
    </html>
  );
}
