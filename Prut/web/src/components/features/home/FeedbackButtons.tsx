"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Sparkles } from "lucide-react";
import { getApiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";

/**
 * Reject reasons. A thumbs-down that records only "bad" cannot tune anything,
 * so the down vote asks one short question (master plan 3.9). The ids match the
 * CHECK constraint on prompt_feedback.reason.
 */
const REASONS = [
  { id: "too_short", label: "קצר מדי", instruction: "הרחב את התוצאה ופרט יותר." },
  { id: "too_generic", label: "כללי מדי", instruction: "הפוך את התוצאה לספציפית ומדויקת יותר." },
  {
    id: "wrong_language",
    label: "לא בשפה שלי",
    instruction: "כתוב את התוצאה בעברית טבעית וזורמת.",
  },
  {
    id: "missed_intent",
    label: "פספס את הכוונה",
    instruction: "התמקד מחדש בכוונה המקורית של הבקשה.",
  },
] as const;

interface FeedbackButtonsProps {
  inputText: string;
  enhancedText: string;
  capabilityMode: string;
  /**
   * Runs a refinement turn on the current result. Refinement costs no credit,
   * so a rejection can be answered with a fix instead of an apology.
   */
  onRetryFree?: (instruction: string) => void;
}

export function FeedbackButtons({
  inputText,
  enhancedText,
  capabilityMode,
  onRetryFree,
}: FeedbackButtonsProps) {
  const [voted, setVoted] = useState<1 | -1 | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [askingReason, setAskingReason] = useState(false);

  async function send(rating: 1 | -1, reason?: string) {
    setSubmitting(true);
    try {
      await fetch(getApiPath("/api/feedback"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          rating,
          reason,
          input_text: inputText,
          enhanced_text: enhancedText,
          capability_mode: capabilityMode,
        }),
      });
    } catch {
      // Fire-and-forget: a lost vote must not interrupt the user.
    } finally {
      setSubmitting(false);
    }
  }

  function handleUp() {
    if (voted !== null || submitting) return;
    setVoted(1);
    void send(1);
  }

  function handleDown() {
    if (voted !== null || submitting) return;
    // Ask before recording, so the row carries the reason rather than a second
    // write having to find it later.
    setAskingReason(true);
  }

  function chooseReason(r: (typeof REASONS)[number]) {
    setVoted(-1);
    setAskingReason(false);
    void send(-1, r.id);
    onRetryFree?.(r.instruction);
  }

  if (askingReason) {
    return (
      <div className="flex flex-col items-end gap-2" dir="rtl">
        <span className="text-[11px] text-(--text-secondary)">מה היה חסר?</span>
        <div className="flex flex-wrap justify-end gap-1.5">
          {REASONS.map((r) => (
            <button
              key={r.id}
              onClick={() => chooseReason(r)}
              disabled={submitting}
              className="text-[11px] px-2.5 min-h-[36px] rounded-lg border border-(--glass-border) bg-(--glass-bg) text-(--text-secondary) hover:border-amber-500/40 hover:text-amber-800 dark:hover:text-amber-200 transition-colors disabled:opacity-40"
            >
              {r.label}
            </button>
          ))}
          <button
            onClick={() => {
              setVoted(-1);
              setAskingReason(false);
              void send(-1);
            }}
            className="text-[11px] px-2.5 min-h-[36px] rounded-lg text-(--text-muted) hover:text-(--text-secondary) transition-colors"
          >
            דלג
          </button>
        </div>
      </div>
    );
  }

  if (voted !== null) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-(--text-secondary)">
        {voted === 1 ? (
          <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        )}
        {voted === 1 ? "תודה על המשוב" : "תודה, מנסים שוב בחינם"}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5" dir="rtl">
      <span className="text-[11px] text-(--text-muted)">שדרוג טוב?</span>
      <button
        onClick={handleUp}
        disabled={submitting}
        aria-label="כן, טוב"
        className={cn(
          "p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-(--glass-border) bg-(--glass-bg) text-(--text-muted) hover:text-emerald-500 hover:border-emerald-500/40 transition-colors cursor-pointer disabled:opacity-40",
        )}
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={handleDown}
        disabled={submitting}
        aria-label="לא, לא טוב"
        className={cn(
          "p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-(--glass-border) bg-(--glass-bg) text-(--text-muted) hover:text-rose-500 hover:border-rose-500/40 transition-colors cursor-pointer disabled:opacity-40",
        )}
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
