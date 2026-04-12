import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rowToPrompt, getOrderKey, getCategoriesKey, readOrderMap, persistOrderMap } from '../row-mapper';
import { CapabilityMode } from '@/lib/capability-mode';

// In-memory localStorage mock
function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

let localStorageMock: ReturnType<typeof makeLocalStorageMock>;

beforeEach(() => {
  localStorageMock = makeLocalStorageMock();
  vi.stubGlobal('localStorage', localStorageMock);
});

// ---------------------------------------------------------------------------
// getOrderKey
// ---------------------------------------------------------------------------
describe('getOrderKey', () => {
  it('returns base key when userId is null', () => {
    expect(getOrderKey(null)).toBe('peroot_personal_order');
  });

  it('returns base key when userId is undefined', () => {
    expect(getOrderKey(undefined)).toBe('peroot_personal_order');
  });

  it('appends userId when provided', () => {
    expect(getOrderKey('user-123')).toBe('peroot_personal_order_user-123');
  });
});

// ---------------------------------------------------------------------------
// getCategoriesKey
// ---------------------------------------------------------------------------
describe('getCategoriesKey', () => {
  it('returns base key when userId is null', () => {
    expect(getCategoriesKey(null)).toBe('peroot_personal_categories');
  });

  it('returns base key when userId is undefined', () => {
    expect(getCategoriesKey(undefined)).toBe('peroot_personal_categories');
  });

  it('appends userId when provided', () => {
    expect(getCategoriesKey('user-abc')).toBe('peroot_personal_categories_user-abc');
  });
});

// ---------------------------------------------------------------------------
// readOrderMap
// ---------------------------------------------------------------------------
describe('readOrderMap', () => {
  it('returns empty map when localStorage is empty', () => {
    expect(readOrderMap('user-1')).toEqual({});
  });

  it('returns parsed map when localStorage has valid JSON', () => {
    const key = getOrderKey('user-1');
    localStorageMock.setItem(key, JSON.stringify({ 'prompt-a': 0, 'prompt-b': 1 }));
    expect(readOrderMap('user-1')).toEqual({ 'prompt-a': 0, 'prompt-b': 1 });
  });

  it('returns empty map when localStorage has invalid JSON', () => {
    const key = getOrderKey('user-1');
    localStorageMock.setItem(key, 'not-valid-json{{{');
    expect(readOrderMap('user-1')).toEqual({});
  });

  it('returns empty map when value is an array (not an object map)', () => {
    const key = getOrderKey('user-1');
    localStorageMock.setItem(key, JSON.stringify([1, 2, 3]));
    expect(readOrderMap('user-1')).toEqual({});
  });

  it('uses base key when userId is null', () => {
    localStorageMock.setItem('peroot_personal_order', JSON.stringify({ 'x': 5 }));
    expect(readOrderMap(null)).toEqual({ x: 5 });
  });
});

// ---------------------------------------------------------------------------
// persistOrderMap
// ---------------------------------------------------------------------------
describe('persistOrderMap', () => {
  it('writes sort_index values to localStorage', () => {
    const items = [
      { id: 'a', sort_index: 10 },
      { id: 'b', sort_index: 20 },
    ] as import('@/lib/types').PersonalPrompt[];

    persistOrderMap('user-1', items);

    const raw = localStorageMock.getItem('peroot_personal_order_user-1');
    expect(JSON.parse(raw!)).toEqual({ a: 10, b: 20 });
  });

  it('falls back to positional index when sort_index is undefined', () => {
    const items = [
      { id: 'a' },
      { id: 'b' },
    ] as import('@/lib/types').PersonalPrompt[];

    persistOrderMap('user-2', items);

    const raw = localStorageMock.getItem('peroot_personal_order_user-2');
    expect(JSON.parse(raw!)).toEqual({ a: 0, b: 1 });
  });

  it('uses base key when userId is null', () => {
    const items = [{ id: 'x', sort_index: 3 }] as import('@/lib/types').PersonalPrompt[];
    persistOrderMap(null, items);
    const raw = localStorageMock.getItem('peroot_personal_order');
    expect(JSON.parse(raw!)).toEqual({ x: 3 });
  });
});

// ---------------------------------------------------------------------------
// rowToPrompt
// ---------------------------------------------------------------------------
describe('rowToPrompt', () => {
  const baseRow: Record<string, unknown> = {
    id: 'prompt-1',
    title: 'My Prompt',
    prompt: 'Do something',
    prompt_style: '<b>bold</b>',
    category: 'Writing',
    personal_category: 'Work',
    use_case: 'general',
    source: 'manual',
    use_count: 3,
    capability_mode: CapabilityMode.STANDARD,
    tags: ['tag1', 'tag2'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    last_used_at: '2024-01-03T00:00:00Z',
    is_pinned: true,
    is_template: false,
    success_count: 2,
    fail_count: 1,
    sort_index: 5,
  };

  it('maps all fields correctly', () => {
    const result = rowToPrompt(baseRow, 0, {});
    expect(result.id).toBe('prompt-1');
    expect(result.title).toBe('My Prompt');
    expect(result.prompt).toBe('Do something');
    expect(result.prompt_style).toBe('<b>bold</b>');
    expect(result.category).toBe('Writing');
    expect(result.personal_category).toBe('Work');
    expect(result.use_case).toBe('general');
    expect(result.source).toBe('manual');
    expect(result.use_count).toBe(3);
    expect(result.capability_mode).toBe(CapabilityMode.STANDARD);
    expect(result.tags).toEqual(['tag1', 'tag2']);
    expect(result.is_pinned).toBe(true);
    expect(result.is_template).toBe(false);
    expect(result.success_count).toBe(2);
    expect(result.fail_count).toBe(1);
  });

  it('uses DB sort_index when orderMap has no entry', () => {
    const result = rowToPrompt(baseRow, 0, {});
    expect(result.sort_index).toBe(5);
  });

  it('uses orderMap sort_index over DB sort_index', () => {
    const result = rowToPrompt(baseRow, 0, { 'prompt-1': 99 });
    expect(result.sort_index).toBe(99);
  });

  it('falls back to positional index when both orderMap and DB sort_index are absent', () => {
    const rowWithoutSort = { ...baseRow, sort_index: undefined };
    const result = rowToPrompt(rowWithoutSort, 7, {});
    expect(result.sort_index).toBe(7);
  });

  it('handles null/undefined optional fields gracefully', () => {
    const minimalRow: Record<string, unknown> = {
      id: 'p2',
      title: 'Minimal',
      prompt: 'Do it',
      category: 'Cat',
      use_case: 'misc',
      source: 'library',
    };
    const result = rowToPrompt(minimalRow, 0, {});
    expect(result.personal_category).toBeNull();
    expect(result.use_count).toBe(0);
    expect(result.tags).toEqual([]);
    expect(result.is_pinned).toBe(false);
    expect(result.is_template).toBe(false);
    expect(result.success_count).toBe(0);
    expect(result.fail_count).toBe(0);
    expect(result.last_used_at).toBeNull();
    expect(result.prompt_style).toBeUndefined();
  });

  it('converts date strings to timestamps', () => {
    const result = rowToPrompt(baseRow, 0, {});
    expect(typeof result.created_at).toBe('number');
    expect(typeof result.updated_at).toBe('number');
    expect(typeof result.last_used_at).toBe('number');
  });

  it('uses created_at for updated_at when updated_at is absent', () => {
    const rowNoUpdated = { ...baseRow, updated_at: undefined };
    const result = rowToPrompt(rowNoUpdated, 0, {});
    expect(result.updated_at).toBe(result.created_at);
  });
});
