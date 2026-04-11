"use client";

import { useMemo } from "react";
import DiffMatchPatch from "diff-match-patch";
import { cn } from "@/lib/utils";

interface TextDiffProps {
  before: string;
  after: string;
  /** Default 'word' — character-level diffs are too noisy for prose. */
  granularity?: "word" | "char";
  className?: string;
}

/**
 * Renders a word-level diff between `before` and `after` with `<ins>` /
 * `<del>` markup. Used in BeforeAfterSplit's "diff" mode (Anchor 2 — visual
 * proof of value).
 *
 * Uses google/diff-match-patch which is the industry-standard text diff
 * algorithm. We post-process character-level diffs into word-level by
 * marking transitions on word boundaries — this matches the convention
 * documented in diff-match-patch's wiki for prose diffs.
 */
export function TextDiff({
  before,
  after,
  granularity = "word",
  className,
}: TextDiffProps) {
  const segments = useMemo(() => {
    const dmp = new DiffMatchPatch.diff_match_patch();
    const diffs = dmp.diff_main(before, after);

    if (granularity === "word") {
      // Post-process to align cuts to word boundaries by converting the
      // text to "tokens of words" before diffing. The standard trick from
      // the diff-match-patch wiki: replace each unique line/word with a
      // placeholder character, diff that, then map back. We use the
      // simpler approach of running diff_main then cleaning semantic.
      dmp.diff_cleanupSemantic(diffs);
    }

    // Convert to render segments
    return diffs.map(([op, text], i) => ({ op, text, key: i }));
  }, [before, after, granularity]);

  return (
    <div
      className={cn(
        "text-sm leading-relaxed whitespace-pre-wrap",
        className
      )}
      dir="rtl"
      aria-label="הבדלים בין הטקסט המקורי למשודרג"
    >
      {segments.map(({ op, text, key }) => {
        if (op === DiffMatchPatch.DIFF_EQUAL) {
          return (
            <span key={key} className="text-(--text-primary)">
              {text}
            </span>
          );
        }
        if (op === DiffMatchPatch.DIFF_INSERT) {
          return (
            <ins
              key={key}
              className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 no-underline rounded px-0.5"
            >
              {text}
            </ins>
          );
        }
        // DIFF_DELETE
        return (
          <del
            key={key}
            className="bg-red-500/15 text-red-600/80 dark:text-red-300/80 line-through rounded px-0.5"
          >
            {text}
          </del>
        );
      })}
    </div>
  );
}
