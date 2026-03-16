'use client';

import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProBadgeProps {
  size?: 'sm' | 'md';
  className?: string;
}

export function ProBadge({ size = 'sm', className }: ProBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 font-bold rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-400 select-none',
        size === 'sm' && 'px-1.5 py-0.5 text-[10px]',
        size === 'md' && 'px-2 py-0.5 text-xs',
        className,
      )}
    >
      <Crown className={cn(size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
      Pro
    </span>
  );
}
