import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { filterDuplicates } from '../dedup';

function mockSupabaseWithTitles(titles: { title: string }[]): SupabaseClient {
  const chain = {
    select: () => ({
      limit: () => Promise.resolve({ data: titles, error: null }),
    }),
  };
  return {
    from: vi.fn().mockReturnValue(chain),
  } as unknown as SupabaseClient;
}

describe('filterDuplicates', () => {
  it('uses one DB read and marks within-batch second occurrence as duplicate', async () => {
    const supabase = mockSupabaseWithTitles([{ title: 'existing from db' }]);
    const { decisions } = await filterDuplicates(
      supabase,
      ['brand new title', 'brand new title'],
      'public_library_prompts',
    );
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(decisions[0]?.ok).toBe(true);
    expect(decisions[1]?.ok).toBe(false);
    if (decisions[1] && !decisions[1].ok) {
      expect(decisions[1].similar).toBe('brand new title');
    }
  });

  it('flags similarity to an existing DB title', async () => {
    const supabase = mockSupabaseWithTitles([{ title: 'marketing tips for startups' }]);
    const { decisions } = await filterDuplicates(
      supabase,
      ['marketing tips for startup'],
      'public_library_prompts',
    );
    expect(decisions[0]?.ok).toBe(false);
  });
});
