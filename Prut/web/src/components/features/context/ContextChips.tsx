"use client";

import type { ContextAttachment } from "@/lib/context/types";
import { AttachmentCard } from "./AttachmentCard";

interface ContextChipsProps {
  attachments: ContextAttachment[];
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
  onRetryFile?: (id: string) => void;
  onRetryImage?: (id: string) => void;
  /** @deprecated — kept for call-site compat; ContextChips no longer enforces file count. */
  maxFiles?: number;
  tokenLimit?: number;
  tier?: "free" | "pro";
}

function formatTokenCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

export function ContextChips({
  attachments,
  onRemove,
  onRetry,
  onRetryFile,
  onRetryImage,
  tokenLimit,
}: ContextChipsProps) {
  if (attachments.length === 0) return null;

  const totalTokens = attachments.reduce(
    (sum, a) => sum + (a.status === "ready" ? (a.block?.injected?.tokenCount ?? 0) : 0),
    0,
  );
  const effectiveLimit = tokenLimit ?? 8_000;
  const isOverLimit = totalTokens > effectiveLimit;

  return (
    <div dir="rtl" className="flex flex-col gap-3">
      {/* Attachment Cards */}
      <div className="flex flex-col gap-2">
        {attachments.map((a) => (
          <AttachmentCard
            key={a.id}
            block={a.block}
            stage={a.stage ?? "uploading"}
            title={a.name || a.url || "attachment"}
            onRemove={() => onRemove(a.id)}
            onRetry={
              onRetry && a.type === "url"
                ? () => onRetry(a.id)
                : onRetryFile && a.type === "file"
                  ? () => onRetryFile(a.id)
                  : onRetryImage && a.type === "image"
                    ? () => onRetryImage(a.id)
                    : undefined
            }
          />
        ))}
      </div>

      {/* The upload state itself lives on the tools button now
          (attachment-summary); only the one thing that needs an action
          stays here. */}
      {isOverLimit && (
        <p className="text-[11px] text-red-500 font-bold">
          יותר מדי context, הסירו קובץ (מקסימום {formatTokenCount(effectiveLimit)} tokens)
        </p>
      )}
    </div>
  );
}
