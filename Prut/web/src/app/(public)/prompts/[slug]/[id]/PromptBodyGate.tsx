"use client";

import { CopyButton } from "@/components/ui/CopyButton";
import { UsePromptButton } from "../UsePromptButton";

interface Props {
  promptId: string;
  fullText: string;
  title: string;
  slug: string;
  capabilityMode: string | null;
}

/**
 * The prompt body card. The full prompt is server-rendered and OPEN to
 * everyone — the raw prompt is the marketing asset that ranks and gets
 * cited; the product being sold is the personalized enhancement, pitched
 * by the CTA below. (The old auth gate served 160-char stubs to guests,
 * which made all ~650 library pages thin near-duplicates for search.)
 */
export function PromptBodyGate({ promptId, fullText, title, slug, capabilityMode }: Props) {
  const isImage = capabilityMode === "IMAGE_GENERATION";

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50">
        <span className="text-xs font-medium text-muted-foreground">הפרומפט</span>
        <div className="flex items-center gap-2">
          <CopyButton text={fullText} label="העתק פרומפט" variant="button" />
          <UsePromptButton id={promptId} title={title} prompt={fullText} category={slug} />
        </div>
      </div>

      <div
        className={`p-5 text-sm leading-relaxed text-foreground whitespace-pre-wrap ${
          isImage ? "font-mono dir-ltr text-left" : ""
        }`}
        dir={isImage ? "ltr" : undefined}
      >
        {fullText}
      </div>
    </div>
  );
}
