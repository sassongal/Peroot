import { describe, it, expect } from 'vitest';
import { applyGuestFiltersAndSort } from '../sort';
import { PersonalPrompt } from '@/lib/types';
import { CapabilityMode } from '@/lib/capability-mode';

function makePrompt(overrides: Partial<PersonalPrompt> & { id: string }): PersonalPrompt {
  return {
    title: 'Test Prompt',
    prompt: 'Some prompt body',
    category: 'General',
    personal_category: null,
    use_case: 'Testing',
    created_at: Date.now(),
    updated_at: Date.now(),
    use_count: 0,
    source: 'manual',
    capability_mode: CapabilityMode.STANDARD,
    tags: [],
    is_pinned: false,
    is_template: false,
    last_used_at: null,
    sort_index: 0,
    ...overrides,
  };
}

const baseFilters = {
  activeFolder: null,
  searchQuery: '',
  capabilityFilter: null,
};

const baseSort = { sortBy: 'recent' };

describe('applyGuestFiltersAndSort', () => {
  it('returns all prompts when no filters active', () => {
    const prompts = [makePrompt({ id: '1' }), makePrompt({ id: '2' }), makePrompt({ id: '3' })];
    const result = applyGuestFiltersAndSort(prompts, baseFilters, baseSort);
    expect(result).toHaveLength(3);
  });

  it('filters by personal_category (folder)', () => {
    const prompts = [
      makePrompt({ id: '1', personal_category: 'work' }),
      makePrompt({ id: '2', personal_category: 'personal' }),
      makePrompt({ id: '3', personal_category: 'work' }),
    ];
    const result = applyGuestFiltersAndSort(
      prompts,
      { ...baseFilters, activeFolder: 'work' },
      baseSort
    );
    expect(result).toHaveLength(2);
    expect(result.every(p => p.personal_category === 'work')).toBe(true);
  });

  it('filters by search text matching title', () => {
    const prompts = [
      makePrompt({ id: '1', title: 'Write a blog post' }),
      makePrompt({ id: '2', title: 'Summarize text' }),
    ];
    const result = applyGuestFiltersAndSort(
      prompts,
      { ...baseFilters, searchQuery: 'blog' },
      baseSort
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by search text matching prompt body', () => {
    const prompts = [
      makePrompt({ id: '1', title: 'Prompt A', prompt: 'Generate a detailed outline for your essay' }),
      makePrompt({ id: '2', title: 'Prompt B', prompt: 'Translate this document' }),
    ];
    const result = applyGuestFiltersAndSort(
      prompts,
      { ...baseFilters, searchQuery: 'outline' },
      baseSort
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('search is case-insensitive', () => {
    const prompts = [
      makePrompt({ id: '1', title: 'Write a Blog Post' }),
      makePrompt({ id: '2', title: 'Summarize Text' }),
    ];
    const result = applyGuestFiltersAndSort(
      prompts,
      { ...baseFilters, searchQuery: 'BLOG' },
      baseSort
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by capability mode', () => {
    const prompts = [
      makePrompt({ id: '1', capability_mode: CapabilityMode.STANDARD }),
      makePrompt({ id: '2', capability_mode: CapabilityMode.IMAGE_GENERATION }),
      makePrompt({ id: '3', capability_mode: CapabilityMode.STANDARD }),
    ];
    const result = applyGuestFiltersAndSort(
      prompts,
      { ...baseFilters, capabilityFilter: CapabilityMode.IMAGE_GENERATION },
      baseSort
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('sorts by updated_at descending (recent/default)', () => {
    const now = Date.now();
    const prompts = [
      makePrompt({ id: '1', updated_at: now - 2000 }),
      makePrompt({ id: '2', updated_at: now }),
      makePrompt({ id: '3', updated_at: now - 1000 }),
    ];
    const result = applyGuestFiltersAndSort(prompts, baseFilters, { sortBy: 'recent' });
    // pinned items would float to top, none pinned here
    expect(result[0].id).toBe('2');
    expect(result[1].id).toBe('3');
    expect(result[2].id).toBe('1');
  });

  it('sorts by title ascending', () => {
    const prompts = [
      makePrompt({ id: '1', title: 'Zebra' }),
      makePrompt({ id: '2', title: 'Apple' }),
      makePrompt({ id: '3', title: 'Mango' }),
    ];
    const result = applyGuestFiltersAndSort(prompts, baseFilters, { sortBy: 'title' });
    expect(result[0].title).toBe('Apple');
    expect(result[1].title).toBe('Mango');
    expect(result[2].title).toBe('Zebra');
  });

  it('sorts pinned items to top regardless of sort order', () => {
    const now = Date.now();
    const prompts = [
      makePrompt({ id: '1', title: 'A', updated_at: now, is_pinned: false }),
      makePrompt({ id: '2', title: 'B', updated_at: now - 1000, is_pinned: true }),
    ];
    const result = applyGuestFiltersAndSort(prompts, baseFilters, { sortBy: 'recent' });
    expect(result[0].id).toBe('2'); // pinned rises to top
  });

  it('filters pinned prompts when activeFolder is "pinned"', () => {
    const prompts = [
      makePrompt({ id: '1', is_pinned: true }),
      makePrompt({ id: '2', is_pinned: false }),
      makePrompt({ id: '3', is_pinned: true }),
    ];
    const result = applyGuestFiltersAndSort(
      prompts,
      { ...baseFilters, activeFolder: 'pinned' },
      baseSort
    );
    expect(result).toHaveLength(2);
    expect(result.every(p => p.is_pinned)).toBe(true);
  });

  it('combined filter (folder + search) + sort (title)', () => {
    const prompts = [
      makePrompt({ id: '1', title: 'Zebra work', personal_category: 'work' }),
      makePrompt({ id: '2', title: 'Apple work', personal_category: 'work' }),
      makePrompt({ id: '3', title: 'Apple personal', personal_category: 'personal' }),
      makePrompt({ id: '4', title: 'Mango work', personal_category: 'work' }),
    ];
    const result = applyGuestFiltersAndSort(
      prompts,
      { ...baseFilters, activeFolder: 'work', searchQuery: 'work' },
      { sortBy: 'title' }
    );
    // folder 'work' → ids 1,2,4; search 'work' matches all their titles; sort by title
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('2'); // Apple
    expect(result[1].id).toBe('4'); // Mango
    expect(result[2].id).toBe('1'); // Zebra
  });
});
