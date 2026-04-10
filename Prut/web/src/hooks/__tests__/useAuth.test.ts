// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: null } }),
      signOut: async () => ({}),
      onAuthStateChange: (_cb: (event: string, session: unknown) => void) => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
  }),
}));

describe('useAuth', () => {
  it('returns null user when not authenticated', async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await new Promise(r => setTimeout(r, 10));
    });
    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('provides signOut function', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.signOut).toBeInstanceOf(Function);
  });

  it('provides planTier defaulting to guest', async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await new Promise(r => setTimeout(r, 10));
    });
    expect(result.current.planTier).toBe('guest');
  });
});
