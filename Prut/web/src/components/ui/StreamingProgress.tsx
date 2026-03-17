'use client';

import type { StreamPhase } from '@/hooks/usePromptWorkflow';
import { Send, PenLine } from 'lucide-react';

const PHASE_CONFIG: Record<string, { icon: typeof Send; labelHe: string }> = {
  sending: { icon: Send, labelHe: 'שולח' },
  writing: { icon: PenLine, labelHe: 'כותב' },
};

interface StreamingProgressProps {
  phase: StreamPhase;
}

export default function StreamingProgress({ phase }: StreamingProgressProps) {
  if (phase === 'idle' || phase === 'done') return null;

  const config = PHASE_CONFIG[phase];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className="flex items-center justify-center gap-2.5 text-sm text-amber-600/80 dark:text-amber-400/80 py-3">
      <Icon className="w-4 h-4 animate-pulse" />
      <span className="font-medium">{config.labelHe}</span>
      <span className="inline-flex gap-0.5">
        <span className="animate-pulse" style={{ animationDelay: '0ms' }}>.</span>
        <span className="animate-pulse" style={{ animationDelay: '150ms' }}>.</span>
        <span className="animate-pulse" style={{ animationDelay: '300ms' }}>.</span>
      </span>
    </div>
  );
}
