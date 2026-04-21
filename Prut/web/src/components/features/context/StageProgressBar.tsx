"use client";
import { motion } from "framer-motion";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import type { ProcessingStage } from "@/lib/context/engine/types";

const STAGES: Array<{ id: ProcessingStage; label: string }> = [
  { id: "uploading", label: "מעלה" },
  { id: "extracting", label: "קורא" },
  { id: "enriching", label: "מבין" },
  { id: "ready", label: "מוכן" },
];

type PillState = "pending" | "active" | "complete";

function pillState(current: ProcessingStage, pillId: ProcessingStage): PillState {
  // treat warning as ready for ordering purposes
  const normalized = current === "warning" ? "ready" : current;
  const order = STAGES.map((s) => s.id);
  const ci = order.indexOf(normalized);
  const pi = order.indexOf(pillId);
  if (ci === -1 || pi === -1) return "pending";
  if (pi < ci) return "complete";
  if (pi === ci) return "active";
  return "pending";
}

export function StageProgressBar({ stage }: { stage: ProcessingStage }) {
  if (stage === "error") {
    return (
      <div data-testid="stage-error" className="flex items-center gap-2 text-red-600 text-sm">
        <X className="w-4 h-4" />
        <span>לא הצלחנו — נסה שוב?</span>
      </div>
    );
  }

  const isWarning = stage === "warning";

  return (
    <div className="flex items-center gap-2" dir="rtl">
      {STAGES.map((s) => {
        const state = pillState(stage, s.id);
        const isReadyPillWarning = isWarning && s.id === "ready" && state === "active";
        return (
          <div
            key={s.id}
            data-testid={`stage-pill-${s.id}`}
            data-state={state}
            className={[
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
              isReadyPillWarning && "bg-amber-100 text-amber-700 border border-amber-300",
              !isReadyPillWarning && state === "complete" && "bg-green-100 text-green-700",
              !isReadyPillWarning &&
                state === "active" &&
                "bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 text-white shadow-md",
              !isReadyPillWarning && state === "pending" && "bg-zinc-100 text-zinc-400",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {isReadyPillWarning && <AlertTriangle className="w-3 h-3" />}
            {!isReadyPillWarning && state === "complete" && <Check className="w-3 h-3" />}
            {!isReadyPillWarning && state === "active" && (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-3 h-3" />
              </motion.span>
            )}
            <span>{isReadyPillWarning ? "אזהרה" : s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// test stable export
export function _stagePillTestids() {
  return STAGES.map((s) => `stage-pill-${s.id}`);
}

// Needed for getAllByTestId in tests
StageProgressBar.displayName = "StageProgressBar";
