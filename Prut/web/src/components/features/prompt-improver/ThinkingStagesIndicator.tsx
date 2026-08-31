"use client";

import { useEffect, useState } from "react";
import type { StreamPhase } from "@/hooks/usePromptWorkflow";

const STAGES = ["מנתח את הפרומפט...", "בונה מבנה שיפור...", "מייצר גרסה משופרת..."] as const;

interface Props {
  streamPhase: StreamPhase;
  /** Abort the in-flight stream — this indicator is the ONE progress surface (U2.3). */
  onStop?: () => void;
}

export function ThinkingStagesIndicator({ streamPhase, onStop }: Props) {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    if (streamPhase !== "sending") return;

    const t1 = setTimeout(() => setActiveStage(1), 2000);
    const t2 = setTimeout(() => setActiveStage(2), 5000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [streamPhase]);

  return (
    <div className="p-8 space-y-3" dir="rtl">
      {STAGES.map((label, i) => {
        const isDone = i < activeStage;
        const isActive = i === activeStage;
        const isPending = i > activeStage;

        return (
          <div
            key={i}
            className="flex items-center gap-3 transition-opacity duration-300"
            style={{ opacity: isPending ? 0.35 : 1 }}
          >
            <span className="w-4 h-4 flex items-center justify-center shrink-0">
              {isDone ? (
                <svg
                  className="w-4 h-4 text-(--accent-text)"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="2,8 6,12 14,4" />
                </svg>
              ) : isActive ? (
                <span className="inline-block w-2 h-2 rounded-full bg-(--accent-text) animate-pulse" />
              ) : (
                <span className="inline-block w-2 h-2 rounded-full bg-(--glass-border)" />
              )}
            </span>
            <span
              className="text-sm transition-colors duration-300"
              style={{
                color: isDone
                  ? "var(--text-muted)"
                  : isActive
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
                fontWeight: isActive ? 500 : 400,
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
      {onStop && (
        <button
          type="button"
          onClick={onStop}
          className="mt-2 px-4 py-1.5 min-h-[36px] rounded-lg border border-(--glass-border) text-xs text-(--text-secondary) hover:text-red-500 hover:border-red-500/40 transition-colors cursor-pointer"
        >
          עצור
        </button>
      )}
    </div>
  );
}
