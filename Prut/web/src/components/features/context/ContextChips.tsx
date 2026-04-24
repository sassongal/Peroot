"use client";

import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { ContextAttachment } from "@/lib/context/types";
import { AttachmentCard } from "./AttachmentCard";

interface ContextChipsProps {
  attachments: ContextAttachment[];
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
  /** @deprecated — kept for call-site compat; ContextChips no longer enforces file count. */
  maxFiles?: number;
  tokenLimit?: number;
}

function formatTokenCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

export function ContextChips({ attachments, onRemove, onRetry, tokenLimit }: ContextChipsProps) {
  if (attachments.length === 0) return null;

  const totalTokens = attachments.reduce(
    (sum, a) =>
      sum + (a.status === "ready" ? (a.tokenCount ?? a.block?.injected?.tokenCount ?? 0) : 0),
    0,
  );
  const effectiveLimit = tokenLimit ?? 15_000;
  const isOverLimit = totalTokens > effectiveLimit;
  const readyCount = attachments.filter((a) => a.status === "ready").length;
  const loadingCount = attachments.filter((a) => a.status === "loading").length;
  const errorCount = attachments.filter((a) => a.status === "error").length;

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
            onRetry={onRetry ? () => onRetry(a.id) : undefined}
          />
        ))}
      </div>

      {/* Status Summary */}
      <div className="flex items-center gap-3 text-[10px] flex-wrap">
        {readyCount > 0 && !isOverLimit && (
          <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {readyCount === 1 ? "הקונטקסט נקלט" : `${readyCount} פריטים נקלטו`}
            {totalTokens > 0 && ` · ${formatTokenCount(totalTokens)} tokens`}
          </span>
        )}

        {loadingCount > 0 && (
          <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            {loadingCount === 1 ? "מעבד..." : `מעבד ${loadingCount} פריטים...`}
          </span>
        )}

        {errorCount > 0 && (
          <span className="text-red-400 font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errorCount === 1 ? "שגיאה אחת" : `${errorCount} שגיאות`}
          </span>
        )}

        {isOverLimit && (
          <span className="text-red-400 font-bold">
            יותר מדי context — הסירו קובץ (מקסימום {formatTokenCount(effectiveLimit)} tokens)
          </span>
        )}

        {/* Limits hint */}
        {attachments.length > 0 && (
          <span className="text-[var(--text-muted)]">קובץ עד 10MB · תמונה עד 5MB</span>
        )}
      </div>
    </div>
  );
}
