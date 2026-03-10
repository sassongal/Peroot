'use client';

import type { StreamPhase } from '@/hooks/usePromptWorkflow';

const PHASE_CONFIG: Record<string, { icon: string; labelHe: string; labelEn: string }> = {
  sending: { icon: '📡', labelHe: 'שולח', labelEn: 'Sending' },
  writing: { icon: '✍️', labelHe: 'כותב', labelEn: 'Writing' },
};

interface StreamingProgressProps {
  phase: StreamPhase;
}

export default function StreamingProgress({ phase }: StreamingProgressProps) {
  if (phase === 'idle' || phase === 'done') return null;

  const config = PHASE_CONFIG[phase];
  if (!config) return null;

  return (
    <div className="flex items-center justify-center gap-2 text-sm text-slate-400 animate-pulse py-2">
      <span>{config.icon}</span>
      <span>{config.labelHe}</span>
      <span className="inline-flex gap-0.5">
        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
      </span>
    </div>
  );
}
