"use client";

import { Clock, Plus, Pencil } from 'lucide-react';
import type { PromptEntity } from '@/lib/prompt-entity';
import { formatTriState, formatAbsoluteHe } from '@/lib/dates/format';
import { cn } from '@/lib/utils';

type DateBadgeMode = 'compact' | 'inline' | 'verbose';

interface DateBadgeProps {
  entity: Pick<PromptEntity, 'createdAt' | 'updatedAt' | 'lastUsedAt'>;
  mode?: DateBadgeMode;
  className?: string;
}

const CHIP_BASE =
  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] text-[var(--text-muted)] bg-[var(--glass-bg)] border border-[var(--glass-border)]';

export function DateBadge({ entity, mode = 'inline', className }: DateBadgeProps) {
  const tri = formatTriState(entity);

  if (mode === 'compact') {
    const tooltipParts = [
      `נוצר: ${formatAbsoluteHe(entity.createdAt)}`,
      tri.updated ? `עודכן: ${formatAbsoluteHe(entity.updatedAt)}` : null,
      tri.lastUsed ? `בשימוש: ${formatAbsoluteHe(entity.lastUsedAt)}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <span
        data-testid="date-badge-compact"
        title={tooltipParts}
        className={cn(CHIP_BASE, className)}
      >
        <Clock className="w-3 h-3" aria-hidden="true" />
        {tri.lastUsed ?? tri.updated ?? tri.created}
      </span>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap', className)} dir="rtl">
      <span
        data-testid="date-badge-created"
        title={`נוצר: ${formatAbsoluteHe(entity.createdAt)}`}
        className={CHIP_BASE}
      >
        <Plus className="w-3 h-3" aria-hidden="true" />
        נוצר {tri.created}
      </span>
      {tri.updated && (
        <span
          data-testid="date-badge-updated"
          title={`עודכן: ${formatAbsoluteHe(entity.updatedAt)}`}
          className={CHIP_BASE}
        >
          <Pencil className="w-3 h-3" aria-hidden="true" />
          עודכן {tri.updated}
        </span>
      )}
      {tri.lastUsed && (
        <span
          data-testid="date-badge-last-used"
          title={`בשימוש: ${formatAbsoluteHe(entity.lastUsedAt)}`}
          className={CHIP_BASE}
        >
          <Clock className="w-3 h-3" aria-hidden="true" />
          בשימוש {tri.lastUsed}
        </span>
      )}
    </div>
  );
}
