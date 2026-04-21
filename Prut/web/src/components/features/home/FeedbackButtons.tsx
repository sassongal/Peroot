"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { getApiPath } from "@/lib/api-path";
import { cn } from "@/lib/utils";

interface FeedbackButtonsProps {
  inputText: string;
  enhancedText: string;
  capabilityMode: string;
}

export function FeedbackButtons({ inputText, enhancedText, capabilityMode }: FeedbackButtonsProps) {
  const [voted, setVoted] = useState<1 | -1 | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleVote(rating: 1 | -1) {
    if (voted !== null || submitting) return;
    setSubmitting(true);
    try {
      await fetch(getApiPath("/api/feedback"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          input_text: inputText,
          enhanced_text: enhancedText,
          capability_mode: capabilityMode,
        }),
      });
      setVoted(rating);
    } catch {
      // fire-and-forget; silently ignore
    } finally {
      setSubmitting(false);
    }
  }

  if (voted !== null) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
        {voted === 1 ? (
          <ThumbsUp className="w-3.5 h-3.5" />
        ) : (
          <ThumbsDown className="w-3.5 h-3.5" />
        )}
        תודה על המשוב!
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5" dir="rtl">
      <span className="text-[11px] text-[var(--text-muted)]">שדרוג טוב?</span>
      <button
        onClick={() => handleVote(1)}
        disabled={submitting}
        aria-label="כן, טוב"
        className={cn(
          "p-1.5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-muted)] hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all cursor-pointer disabled:opacity-40",
        )}
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => handleVote(-1)}
        disabled={submitting}
        aria-label="לא, לא טוב"
        className={cn(
          "p-1.5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-muted)] hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10 transition-all cursor-pointer disabled:opacity-40",
        )}
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
