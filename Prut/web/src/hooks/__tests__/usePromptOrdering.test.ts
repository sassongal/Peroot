// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { usePromptOrdering } from '../usePromptOrdering';

describe('usePromptOrdering', () => {
  it('exposes reorderPrompts, movePrompt, movePrompts, addPrompts', () => {
    const { result } = renderHook(() =>
      usePromptOrdering({
        supabase: {} as any,
        user: null,
        allLocalItems: [],
        setAllLocalItems: vi.fn(),
        personalCategories: [],
        refreshCurrentPage: vi.fn(),
        setPersonalCategories: vi.fn(),
      })
    );
    for (const fn of ['reorderPrompts', 'movePrompt', 'movePrompts', 'addPrompts']) {
      expect(typeof (result.current as Record<string, unknown>)[fn], fn).toBe('function');
    }
  });
});
