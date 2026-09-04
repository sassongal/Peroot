"use client";

import { CopyButton } from "@/components/ui/CopyButton";
import type { PromptSegment } from "./prompt-detail-utils";

interface Props {
  /** The prompt split into text runs and field slots, filled values already applied. */
  segments: PromptSegment[];
  /** The text the copy button hands over: the prompt with every filled value substituted. */
  substitutedText: string;
  capabilityMode: string | null;
  /** Fired when the reader copies (best-effort usage signal). */
  onCopy?: () => void;
}

/**
 * The prompt body card. The full prompt is server-rendered and OPEN to
 * everyone (owner decision, 2026-08-31): the raw prompt is the marketing
 * asset that ranks and gets cited; the product being sold is the
 * personalized enhancement, pitched by the single gold CTA beside it. The
 * old auth gate served 160-char stubs to guests, which made all ~650 library
 * pages thin near-duplicates for search. Do not add a login gate here.
 *
 * When the prompt has fields, this card doubles as the live preview: a slot
 * the reader filled shows the value in place, an unfilled slot stays as
 * `{name}` in amber so it is obvious what still needs an answer.
 */
export function PromptBodyGate({ segments, substitutedText, capabilityMode, onCopy }: Props) {
  const isImage = capabilityMode === "IMAGE_GENERATION";

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-secondary/50">
        <span className="text-xs font-medium text-muted-foreground">הפרומפט</span>
        {/* CopyButton stops propagation on click; the capture phase still sees it. */}
        <span onClickCapture={onCopy} className="inline-flex">
          <CopyButton text={substitutedText} label="העתקת הפרומפט" variant="button" />
        </span>
      </div>

      <div
        className={`p-5 text-sm leading-relaxed text-foreground whitespace-pre-wrap ${
          isImage ? "font-mono text-left" : ""
        }`}
        dir={isImage ? "ltr" : undefined}
        data-testid="prompt-preview"
      >
        {segments.map((seg, i) => {
          if (seg.kind === "text") return <span key={i}>{seg.text}</span>;
          if (seg.kind === "filled") {
            return (
              <span
                key={i}
                className="rounded px-0.5 font-semibold text-foreground underline decoration-dotted decoration-amber-500/60 underline-offset-2"
                title={seg.name}
                data-field="filled"
              >
                {seg.value}
              </span>
            );
          }
          return (
            <mark
              key={i}
              className="rounded px-1 bg-amber-500/15 text-amber-800 dark:text-amber-300 font-medium"
              data-field="empty"
            >
              {`{${seg.name}}`}
            </mark>
          );
        })}
      </div>
    </div>
  );
}
