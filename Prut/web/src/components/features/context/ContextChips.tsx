"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle, Zap } from "lucide-react";
import type { ContextAttachment } from "@/lib/context/types";
import { AttachmentCard } from "./AttachmentCard";

interface ContextChipsProps {
  attachments: ContextAttachment[];
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
  maxFiles?: number;
  tokenLimit?: number;
}

function formatTokenCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

export function ContextChips({ attachments, onRemove, onRetry, maxFiles = 3, tokenLimit = 15_000 }: ContextChipsProps) {
  if (attachments.length === 0) return null;

  const totalTokens = attachments.reduce(
    (sum, a) => sum + (a.status === "ready" ? (a.tokenCount ?? a.block?.injected?.tokenCount ?? 0) : 0),
    0
  );
  const isOverLimit = totalTokens > tokenLimit;
  const readyCount = attachments.filter(a => a.status === "ready").length;
  const loadingCount = attachments.filter(a => a.status === "loading").length;
  const errorCount = attachments.filter(a => a.status === "error").length;

  return (
    <motion.div
      dir="rtl"
      className="flex flex-col gap-3"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.3 }}
    >
      {/* Attachment Cards */}
      <AnimatePresence mode="popLayout">
        <div className="flex flex-col gap-2">
          {attachments.map((a) => (
            <AttachmentCard
              key={a.id}
              block={a.block}
              stage={a.stage ?? 'uploading'}
              title={a.name || a.url || 'attachment'}
              onRemove={() => onRemove(a.id)}
              onRetry={onRetry && a.type === 'url' ? () => onRetry(a.id) : undefined}
            />
          ))}
        </div>
      </AnimatePresence>

      {/* Status Summary */}
      <motion.div
        className="flex items-center gap-3 text-[10px] flex-wrap"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {readyCount > 0 && !isOverLimit && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1"
          >
            <Zap className="w-3 h-3" />
            {readyCount === 1 ? "הקונטקסט מוכן" : `${readyCount} פריטים מוכנים`}
            {totalTokens > 0 && ` · ${formatTokenCount(totalTokens)} tokens`}
          </motion.span>
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
            יותר מדי context — הסירו קובץ (מקסימום {formatTokenCount(tokenLimit)} tokens)
          </span>
        )}

        {/* Limits hint */}
        {attachments.length > 0 && attachments.length < maxFiles && (
          <span className="text-(--text-muted)">
            עד {maxFiles} קבצים · קובץ עד 10MB · תמונה עד 5MB
          </span>
        )}
      </motion.div>
    </motion.div>
  );
}
