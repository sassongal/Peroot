"use client";

import { FileText, Globe, ImageIcon, X, Loader2 } from "lucide-react";
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

export function ContextChips({ attachments, onRemove }: ContextChipsProps) {
  if (attachments.length === 0) return null;

  const totalTokens = attachments.reduce(
    (sum, a) => sum + (a.status === "ready" ? (a.tokenCount ?? 0) : 0),
    0
  );
  const isOverLimit = totalTokens > 15_000;

  return (
    <div dir="rtl" className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        {attachments.map((attachment) => {
          const Icon = typeIcons[attachment.type];

          return (
            <div
              key={attachment.id}
              className={cn(
                "group flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs",
                "bg-[var(--glass-bg)] border border-[var(--glass-border)]",
                "transition-colors",
                attachment.status === "error" &&
                  "border-red-500/40 bg-red-500/10"
              )}
            >
              {/* Status icon */}
              {attachment.status === "loading" ? (
                <Loader2 className="w-3 h-3 text-amber-400 animate-spin shrink-0" />
              ) : (
                <Icon
                  className={cn(
                    "w-3 h-3 shrink-0",
                    attachment.status === "error"
                      ? "text-red-400"
                      : "text-[var(--text-muted)]"
                  )}
                />
              )}

              {/* Content */}
              {attachment.status === "loading" && (
                <span className="text-[var(--text-muted)]">מעבד...</span>
              )}

              {attachment.status === "ready" && (
                <>
                  <span className="text-[var(--text-secondary)]">
                    {truncateName(attachment.name)}
                  </span>
                  {attachment.tokenCount != null && (
                    <span className="text-[var(--text-muted)] text-[10px]">
                      ({formatTokenCount(attachment.tokenCount)} tokens)
                    </span>
                  )}
                </>
              )}

              {attachment.status === "error" && (
                <span className="text-red-400">
                  {attachment.error || "שגיאה"}
                </span>
              )}

              {/* Remove button */}
              <button
                type="button"
                onClick={() => onRemove(attachment.id)}
                className={cn(
                  "p-0.5 rounded transition-opacity",
                  "text-[var(--text-muted)] hover:text-red-400",
                  "opacity-0 group-hover:opacity-100",
                  // Always visible on touch devices and for error/ready states
                  attachment.status !== "loading" && "sm:opacity-0 opacity-100"
                )}
                aria-label="הסרה"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Over-limit warning */}
      {isOverLimit && (
        <p className="text-[10px] text-red-400 font-medium">
          יותר מדי context — נסו להסיר קובץ
        </p>
      )}
    </div>
  );
}
