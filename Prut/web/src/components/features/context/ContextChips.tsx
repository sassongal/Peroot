"use client";

import { FileText, Globe, ImageIcon, X, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContextAttachment } from "@/lib/context/types";

interface ContextChipsProps {
  attachments: ContextAttachment[];
  onRemove: (id: string) => void;
}

function formatTokenCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return String(count);
}

function truncateName(name: string, maxLen = 24): string {
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen - 3) + "...";
}

const typeIcons = {
  file: FileText,
  url: Globe,
  image: ImageIcon,
} as const;

const typeLabels: Record<string, string> = {
  file: "קובץ",
  url: "קישור",
  image: "תמונה",
};

export function ContextChips({ attachments, onRemove }: ContextChipsProps) {
  if (attachments.length === 0) return null;

  const totalTokens = attachments.reduce(
    (sum, a) => sum + (a.status === "ready" ? (a.tokenCount ?? 0) : 0),
    0
  );
  const isOverLimit = totalTokens > 15_000;
  const readyCount = attachments.filter(a => a.status === "ready").length;

  return (
    <div dir="rtl" className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        {attachments.map((attachment) => {
          const Icon = typeIcons[attachment.type];

          return (
            <div
              key={attachment.id}
              className={cn(
                "group relative flex items-center gap-1.5 ps-2.5 pe-7 py-1.5 rounded-lg text-xs",
                "bg-[var(--glass-bg)] border border-[var(--glass-border)]",
                "transition-all duration-200",
                attachment.status === "error" &&
                  "border-red-500/40 bg-red-500/10",
                attachment.status === "ready" &&
                  "border-emerald-500/30 bg-emerald-500/5"
              )}
            >
              {/* Status icon */}
              {attachment.status === "loading" ? (
                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
              ) : attachment.status === "ready" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <Icon
                  className="w-3.5 h-3.5 text-red-400 shrink-0"
                />
              )}

              {/* Content */}
              {attachment.status === "loading" && (
                <span className="text-[var(--text-muted)]">
                  מעבד {typeLabels[attachment.type]}...
                </span>
              )}

              {attachment.status === "ready" && (
                <>
                  <span className="text-[var(--text-secondary)] font-medium">
                    {truncateName(attachment.name)}
                  </span>
                  {attachment.tokenCount != null && (
                    <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-medium">
                      {formatTokenCount(attachment.tokenCount)} tokens
                    </span>
                  )}
                </>
              )}

              {attachment.status === "error" && (
                <span className="text-red-400">
                  {attachment.error || "שגיאה"}
                </span>
              )}

              {/* Remove button — always visible */}
              <button
                type="button"
                onClick={() => onRemove(attachment.id)}
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 end-1.5 p-0.5 rounded-full transition-colors",
                  "text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10",
                  "cursor-pointer"
                )}
                aria-label={`הסר ${typeLabels[attachment.type]}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Context status summary */}
      {readyCount > 0 && !isOverLimit && (
        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {readyCount === 1 ? "הקונטקסט נקלט בהצלחה" : `${readyCount} פריטי קונטקסט נקלטו בהצלחה`}
          {totalTokens > 0 && ` · ${formatTokenCount(totalTokens)} tokens`}
        </p>
      )}

      {/* Over-limit warning */}
      {isOverLimit && (
        <p className="text-[10px] text-red-400 font-medium">
          יותר מדי context — נסו להסיר קובץ
        </p>
      )}
    </div>
  );
}
