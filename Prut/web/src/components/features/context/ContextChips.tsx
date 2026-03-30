"use client";

import { FileText, Globe, ImageIcon, X, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, FileType } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContextAttachment } from "@/lib/context/types";

interface ContextChipsProps {
  attachments: ContextAttachment[];
  onRemove: (id: string) => void;
}

function formatTokenCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

function formatSize(mb?: number): string {
  if (!mb) return "";
  if (mb < 1) return `${Math.round(mb * 1024)}KB`;
  return `${mb.toFixed(1)}MB`;
}

function truncateName(name: string, maxLen = 30): string {
  if (name.length <= maxLen) return name;
  const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
  const base = name.slice(0, maxLen - ext.length - 3);
  return base + '...' + ext;
}

function getFileIcon(attachment: ContextAttachment) {
  if (attachment.type === 'image') return ImageIcon;
  if (attachment.type === 'url') return Globe;
  const fmt = (attachment.format || attachment.name.split('.').pop() || '').toLowerCase();
  if (fmt === 'xlsx' || fmt === 'csv' || fmt === 'xls') return FileSpreadsheet;
  if (fmt === 'pdf') return FileType;
  return FileText;
}

function getFormatLabel(attachment: ContextAttachment): string {
  if (attachment.type === 'url') return 'URL';
  if (attachment.type === 'image') {
    const ext = attachment.name.split('.').pop()?.toUpperCase() || 'IMG';
    return ext;
  }
  return (attachment.format || attachment.name.split('.').pop() || 'FILE').toUpperCase();
}

function getExtractSummary(attachment: ContextAttachment): string | null {
  if (attachment.status !== 'ready' || !attachment.extractedText) return null;
  const text = attachment.extractedText;
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (attachment.type === 'image') {
    return text.length > 80 ? text.slice(0, 77) + '...' : text;
  }
  if (wordCount > 10) {
    return `${wordCount} מילים חולצו`;
  }
  return null;
}

const typeLabels: Record<string, string> = {
  file: "קובץ",
  url: "קישור",
  image: "תמונה",
};

const LIMITS = {
  file: { maxSize: '10MB', types: 'PDF, Word, Excel, CSV, TXT' },
  image: { maxSize: '5MB', types: 'JPG, PNG, WebP, GIF' },
  url: { maxSize: '', types: '' },
};

export function ContextChips({ attachments, onRemove }: ContextChipsProps) {
  if (attachments.length === 0) return null;

  const totalTokens = attachments.reduce(
    (sum, a) => sum + (a.status === "ready" ? (a.tokenCount ?? 0) : 0),
    0
  );
  const isOverLimit = totalTokens > 15_000;
  const readyCount = attachments.filter(a => a.status === "ready").length;
  const loadingCount = attachments.filter(a => a.status === "loading").length;
  const errorCount = attachments.filter(a => a.status === "error").length;

  return (
    <div dir="rtl" className="flex flex-col gap-3">
      {/* Attachment Cards */}
      <div className="flex flex-wrap gap-2">
        {attachments.map((attachment) => {
          const Icon = getFileIcon(attachment);
          const formatLabel = getFormatLabel(attachment);
          const summary = getExtractSummary(attachment);
          const isLoading = attachment.status === "loading";
          const isReady = attachment.status === "ready";
          const isError = attachment.status === "error";

          return (
            <div
              key={attachment.id}
              className={cn(
                "group relative flex items-start gap-3 p-3 rounded-2xl min-w-[200px] max-w-[320px]",
                "border transition-all duration-300",
                isLoading && "bg-amber-500/5 border-amber-500/20 animate-pulse",
                isReady && "bg-emerald-500/5 border-emerald-500/20",
                isError && "bg-red-500/5 border-red-500/20",
              )}
            >
              {/* Icon / Thumbnail */}
              <div className={cn(
                "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
                isLoading && "bg-amber-500/10",
                isReady && "bg-emerald-500/10",
                isError && "bg-red-500/10",
              )}>
                {isLoading ? (
                  <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                ) : isReady ? (
                  <div className="relative">
                    <Icon className="w-5 h-5 text-emerald-500" />
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 absolute -top-1 -end-1 bg-white dark:bg-zinc-900 rounded-full" />
                  </div>
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-0.5">
                {/* Filename */}
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-bold truncate",
                    isReady ? "text-[var(--text-primary)]" : isError ? "text-red-400" : "text-[var(--text-muted)]"
                  )}>
                    {truncateName(attachment.name)}
                  </span>
                </div>

                {/* Type badge + size */}
                <div className="flex items-center gap-2 text-[10px]">
                  <span className={cn(
                    "px-1.5 py-0.5 rounded font-bold uppercase tracking-wider",
                    isReady ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                    isError ? "bg-red-500/10 text-red-400" :
                    "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  )}>
                    {formatLabel}
                  </span>
                  {attachment.size_mb && (
                    <span className="text-[var(--text-muted)]">{formatSize(attachment.size_mb)}</span>
                  )}
                  {isReady && attachment.tokenCount != null && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {formatTokenCount(attachment.tokenCount)} tokens
                    </span>
                  )}
                </div>

                {/* Status text */}
                {isLoading && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">
                    מעבד {typeLabels[attachment.type]}...
                  </p>
                )}

                {isError && (
                  <p className="text-[10px] text-red-400 mt-0.5">
                    {attachment.error || "שגיאה בעיבוד"}
                  </p>
                )}

                {/* Extraction summary */}
                {isReady && summary && (
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-2">
                    {summary}
                  </p>
                )}
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => onRemove(attachment.id)}
                className={cn(
                  "shrink-0 p-1 rounded-lg transition-all",
                  "text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10",
                  "opacity-0 group-hover:opacity-100 cursor-pointer"
                )}
                aria-label={`הסר ${typeLabels[attachment.type]}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
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
            יותר מדי context — הסירו קובץ (מקסימום 15K tokens)
          </span>
        )}

        {/* Limits hint */}
        {attachments.length > 0 && attachments.length < 3 && (
          <span className="text-[var(--text-muted)]">
            עד 3 קבצים · קובץ עד 10MB · תמונה עד 5MB
          </span>
        )}
      </div>
    </div>
  );
}
