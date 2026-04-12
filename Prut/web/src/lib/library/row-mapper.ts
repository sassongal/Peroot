import { PersonalPrompt } from '@/lib/types';
import { CapabilityMode } from '@/lib/capability-mode';
import { logger } from '@/lib/logger';

const CATEGORIES_KEY = 'peroot_personal_categories';
const ORDER_KEY = 'peroot_personal_order';

export const getOrderKey = (userId?: string | null): string =>
  userId ? `${ORDER_KEY}_${userId}` : ORDER_KEY;

export const getCategoriesKey = (userId?: string | null): string =>
  userId ? `${CATEGORIES_KEY}_${userId}` : CATEGORIES_KEY;

export const readOrderMap = (userId?: string | null): Record<string, number> => {
  if (typeof localStorage === 'undefined') return {};
  const key = getOrderKey(userId);
  const raw = localStorage.getItem(key);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, number>;
    }
  } catch (error) {
    logger.warn('Failed to parse personal order map', error);
  }
  return {};
};

export const persistOrderMap = (userId: string | null, items: PersonalPrompt[]): void => {
  if (typeof localStorage === 'undefined') return;
  const key = getOrderKey(userId);
  const next: Record<string, number> = {};
  items.forEach((item, index) => {
    next[item.id] = typeof item.sort_index === 'number' ? item.sort_index : index;
  });
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // QuotaExceededError or similar — order won't persist this session
  }
};

/** Map a raw Supabase row to a PersonalPrompt, applying the orderMap for sort_index.
 *  Priority: localStorage orderMap > DB sort_index > positional index */
export function rowToPrompt(
  row: Record<string, unknown>,
  index: number,
  orderMap: Record<string, number>,
): PersonalPrompt {
  const id = row.id as string;
  const dbSortIndex = typeof row.sort_index === 'number' ? row.sort_index : undefined;
  return {
    id,
    title: row.title as string,
    prompt: row.prompt as string,
    prompt_style: (row.prompt_style as string | undefined) ?? undefined,
    category: (row.category as string) ?? '',
    personal_category: (row.personal_category as string | null) ?? null,
    use_case: row.use_case as string,
    source: row.source as PersonalPrompt['source'],
    use_count: (row.use_count as number) ?? 0,
    capability_mode: (row.capability_mode as CapabilityMode) ?? CapabilityMode.STANDARD,
    tags: (row.tags as string[]) ?? [],
    created_at: row.created_at ? new Date(row.created_at as string).getTime() : Date.now(),
    updated_at: row.updated_at
      ? new Date(row.updated_at as string).getTime()
      : row.created_at
        ? new Date(row.created_at as string).getTime()
        : Date.now(),
    last_used_at: row.last_used_at ? new Date(row.last_used_at as string).getTime() : null,
    is_pinned: (row.is_pinned as boolean) ?? false,
    is_template: (row.is_template as boolean) ?? false,
    success_count: (row.success_count as number) ?? 0,
    fail_count: (row.fail_count as number) ?? 0,
    sort_index: typeof orderMap[id] === 'number' ? orderMap[id] : dbSortIndex ?? index,
  };
}
