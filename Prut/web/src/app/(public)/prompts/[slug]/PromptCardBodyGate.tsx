"use client";

import Link from "next/link";
import { CopyButton } from "@/components/ui/CopyButton";
import { UsePromptButton } from "./UsePromptButton";

interface Props {
  promptId: string;
  title: string;
  fullText: string;
  variables: string[] | null;
  slug: string;
  capabilityMode: string | null;
  detailHref: string;
}

/**
 * Category-grid card body. The full prompt is public (owner decision,
 * 2026-08-31) — the card clamps it visually to 4 lines, the detail page
 * carries the whole thing. Copy and "use in Peroot" work for everyone;
 * the enhancement CTA is the conversion path, not a text-gate.
 */
export function PromptCardBodyGate({
  promptId,
  title,
  fullText,
  variables,
  slug,
  capabilityMode,
  detailHref,
}: Props) {
  const isImage = capabilityMode === "IMAGE_GENERATION";

  return (
    <>
      <div
        className={`text-sm md:text-base text-muted-foreground leading-relaxed line-clamp-4 bg-secondary rounded-xl p-3 border border-border ${
          isImage ? "font-mono text-left dir-ltr" : ""
        }`}
        dir={isImage ? "ltr" : undefined}
      >
        {fullText}
      </div>

      {variables && variables.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {variables.slice(0, 4).map((v) => (
            <span
              key={v}
              className="text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground"
            >
              {v}
            </span>
          ))}
          {variables.length > 4 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
              +{variables.length - 4}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mt-auto pt-1">
        <CopyButton text={fullText} label="העתק פרומפט" variant="button" />
        <UsePromptButton id={promptId} title={title} prompt={fullText} category={slug} />
        <Link
          href={detailHref}
          className="mr-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          פרטים ←
        </Link>
      </div>
    </>
  );
}
