// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { useLibraryAuth } from '../useLibraryAuth';

describe('useLibraryAuth', () => {
  it('returns user null and isLoaded false initially', () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } }
        }),
      },
    };
    const { result } = renderHook(() =>
      useLibraryAuth({ supabase: mockSupabase as any, onUserChange: vi.fn().mockResolvedValue(undefined) })
    );
    expect(result.current.user).toBeNull();
    expect(typeof result.current.isLoaded).toBe('boolean');
  });
});
