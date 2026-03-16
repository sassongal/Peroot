"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

export default function BlogError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error("[Blog] Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-6 text-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <span className="text-2xl">⚠️</span>
      </div>
      <h2 className="text-xl font-bold text-white">שגיאה בטעינת הבלוג</h2>
      <p className="text-slate-400 max-w-md">אירעה שגיאה בטעינת תוכן הבלוג. נסה לרענן את הדף.</p>
      <button onClick={reset} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors">
        נסה שוב
      </button>
    </div>
  );
}
