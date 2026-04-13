// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { usePromptMutations } from '../usePromptMutations';

describe('usePromptMutations', () => {
  it('exposes all mutation functions', () => {
    const { result } = renderHook(() =>
      usePromptMutations({
        supabase: {} as any,
        user: null,
        allLocalItems: [],
        setAllLocalItems: vi.fn(),
        personalLibrary: [],
        setPersonalLibrary: vi.fn(),
        refreshCurrentPage: vi.fn(),
      })
    );
    for (const fn of ['addPrompt', 'removePrompt', 'updatePrompt', 'ratePrompt', 'incrementUseCount', 'togglePin', 'updatePromptContent', 'bumpPersonalLibraryLastUsed', 'updateTags']) {
      expect(typeof (result.current as Record<string, unknown>)[fn], fn).toBe('function');
    }
  });
});
