'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Globe, Image as ImageIcon, X, Sparkles } from 'lucide-react';
import { StageProgressBar } from './StageProgressBar';
import { AttachmentDetailsDrawer } from './AttachmentDetailsDrawer';
import type { ContextBlock, ProcessingStage } from '@/lib/context/engine/types';

interface Props {
  block?: ContextBlock;
  stage: ProcessingStage;
  title: string;
  onRemove: () => void;
  onRetry?: () => void;
}

const ICON: Record<ContextBlock['type'] | 'file', React.ComponentType<{ className?: string }>> = {
  file: FileText,
  url: Globe,
  image: ImageIcon,
};

export function AttachmentCard({ block, stage, title, onRemove, onRetry }: Props) {
  const [open, setOpen] = useState(false);
  const Icon = ICON[block?.type ?? 'file'];
  const canOpen = stage === 'ready' || stage === 'warning';
  const isError = stage === 'error';
  const isReady = stage === 'ready';
  const isProcessing = stage === 'uploading' || stage === 'extracting' || stage === 'enriching';

  return (
    <>
      <motion.button
        type="button"
        onClick={() => canOpen && setOpen(true)}
        disabled={!canOpen}
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={[
          'group relative w-full rounded-xl border p-3 text-right',
          'flex items-start gap-3 overflow-hidden',
          'transition-colors duration-300',
          isError ? 'border-red-400/60 bg-red-50 dark:border-red-500/40 dark:bg-red-950/30' :
          stage === 'warning' ? 'border-amber-400/60 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-950/30' :
          isReady ? 'border-amber-300/50 bg-linear-to-l from-amber-50/80 to-white dark:border-amber-500/20 dark:from-amber-950/20 dark:to-zinc-900 hover:border-amber-400 dark:hover:border-amber-500/40 hover:shadow-md hover:shadow-amber-500/10' :
          'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/60',
          block?.display.metadata.truncated && 'ring-2 ring-amber-200/60 dark:ring-amber-500/30',
        ].filter(Boolean).join(' ')}
      >
        {/* Processing shimmer overlay */}
        {isProcessing && (
          <motion.div
            className="absolute inset-0 bg-linear-to-r from-transparent via-amber-500/[0.07] to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        )}

        {/* Ready glow pulse */}
        {isReady && (
          <motion.div
            className="absolute inset-0 rounded-xl"
            initial={{ boxShadow: '0 0 0 0 rgba(245, 158, 11, 0.3)' }}
            animate={{ boxShadow: ['0 0 0 0 rgba(245, 158, 11, 0.3)', '0 0 12px 2px rgba(245, 158, 11, 0.15)', '0 0 0 0 rgba(245, 158, 11, 0)'] }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        )}

        {/* Icon with brand accent */}
        <div className={[
          'relative shrink-0 mt-0.5 p-1.5 rounded-lg',
          isReady ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-zinc-100 dark:bg-zinc-800',
        ].join(' ')}>
          <Icon className={[
            'w-4 h-4',
            isReady ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-500 dark:text-zinc-400',
          ].join(' ')} />
          {isReady && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 500 }}
              className="absolute -top-1 -left-1"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
            </motion.div>
          )}
        </div>

        <div className="flex-1 min-w-0 relative z-10">
          <div className="font-medium text-sm truncate">{block?.display.title ?? title}</div>
          {block && (
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
              {block.display.documentType} · {block.injected.tokenCount} טוקנים
            </div>
          )}
          <div className="mt-2"><StageProgressBar stage={stage} /></div>
          {block?.display.metadata.truncated && (
            <div className="mt-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-md px-2 py-1.5 border border-amber-200 dark:border-amber-500/30">
              הצגנו את {block.display.metadata.pages ?? '?'} העמודים הראשונים בלבד.{' '}
              <a href="/pricing#context" className="underline font-medium">שדרג ל-Pro</a> למסמכים מלאים.
            </div>
          )}
          {isError && onRetry && (
            <div className="mt-2 flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); onRetry(); }}
                      className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/70 transition-colors">
                נסה שוב
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"
          aria-label="הסר"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.button>
      {block && open && (
        <AttachmentDetailsDrawer block={block} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
