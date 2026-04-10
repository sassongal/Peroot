'use client';
import { useState } from 'react';
import { FileText, Globe, Image as ImageIcon, X } from 'lucide-react';
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

  return (
    <>
      <button
        type="button"
        onClick={() => canOpen && setOpen(true)}
        disabled={!canOpen}
        className={[
          'group relative w-full rounded-xl border p-3 text-right transition-all',
          'flex items-start gap-3',
          isError ? 'border-red-300 bg-red-50' :
          stage === 'warning' ? 'border-amber-300 bg-amber-50' :
          'border-zinc-200 bg-white hover:border-purple-300 hover:shadow-md',
          block?.display.metadata.truncated && 'ring-2 ring-blue-200',
        ].filter(Boolean).join(' ')}
      >
        <Icon className="w-5 h-5 shrink-0 mt-0.5 text-zinc-600" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{block?.display.title ?? title}</div>
          {block && (
            <div className="text-xs text-zinc-500 mt-0.5 truncate">
              {block.display.documentType} · {block.injected.tokenCount} טוקנים
            </div>
          )}
          <div className="mt-2"><StageProgressBar stage={stage} /></div>
          {block?.display.metadata.truncated && (
            <div className="mt-2 text-xs text-blue-700 bg-blue-50 rounded-md px-2 py-1.5 border border-blue-200">
              📄 הצגנו את {block.display.metadata.pages ?? '?'} העמודים הראשונים בלבד.{' '}
              <a href="/pricing#context" className="underline font-medium">שדרג ל-Pro</a> למסמכים מלאים.
            </div>
          )}
          {isError && onRetry && (
            <div className="mt-2 flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); onRetry(); }}
                      className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">
                נסה שוב
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-zinc-100"
          aria-label="הסר"
        >
          <X className="w-4 h-4" />
        </button>
      </button>
      {block && open && (
        <AttachmentDetailsDrawer block={block} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
