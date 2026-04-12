/**
 * Hebrew-first date formatting utilities for prompt surfaces.
 * Hoists Intl.DateTimeFormat instances at module load (one allocation),
 * exposes a relative formatter, an absolute formatter, and a tri-state
 * helper used by DateBadge.
 */

const ABSOLUTE_FORMATTER = new Intl.DateTimeFormat('he-IL', {
  year: '2-digit',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatAbsoluteHe(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return ABSOLUTE_FORMATTER.format(d);
}

export function formatRelativeHe(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  const weeks = Math.round(days / 7);
  const months = Math.round(days / 30);
  const years = Math.round(days / 365);

  if (seconds < 60) return 'לפני כמה שניות';
  if (minutes === 1) return 'לפני דקה';
  if (minutes < 60) return `לפני ${minutes} דקות`;
  if (hours === 1) return 'לפני שעה';
  if (hours < 24) return `לפני ${hours} שעות`;
  if (days === 1) return 'לפני יום';
  if (days < 7) return `לפני ${days} ימים`;
  if (weeks === 1) return 'לפני שבוע';
  if (weeks < 4) return `לפני ${weeks} שבועות`;
  if (months === 1) return 'לפני חודש';
  if (months < 12) return `לפני ${months} חודשים`;
  if (years === 1) return 'לפני שנה';
  return `לפני ${years} שנים`;
}

interface TriStateInput {
  createdAt: string | null | undefined;
  updatedAt: string | null | undefined;
  lastUsedAt: string | null | undefined;
}

interface TriStateOutput {
  created: string;
  updated: string | null;
  lastUsed: string | null;
}

/**
 * Returns relative-formatted strings for the three timestamps. `updated` is
 * suppressed when it equals `created` (no real edit ever happened); `lastUsed`
 * is suppressed when null.
 */
export function formatTriState(input: TriStateInput): TriStateOutput {
  const created = formatRelativeHe(input.createdAt);
  const updatedRaw = formatRelativeHe(input.updatedAt);
  const lastUsedRaw = formatRelativeHe(input.lastUsedAt);
  const updated = input.updatedAt && input.updatedAt !== input.createdAt ? updatedRaw : null;
  const lastUsed = input.lastUsedAt ? lastUsedRaw : null;
  return { created, updated, lastUsed };
}
