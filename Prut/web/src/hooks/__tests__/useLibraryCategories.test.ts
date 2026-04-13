// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { useLibraryCategories } from '../useLibraryCategories';

describe('useLibraryCategories', () => {
  it('starts with empty personalCategories', () => {
    const { result } = renderHook(() =>
      useLibraryCategories({ supabase: {} as any, user: null })
    );
    expect(result.current.personalCategories).toEqual([]);
    expect(typeof result.current.addCategory).toBe('function');
    expect(typeof result.current.renameCategory).toBe('function');
    expect(typeof result.current.deleteCategory).toBe('function');
  });
});
