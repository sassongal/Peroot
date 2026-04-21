// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { useLibraryFetch } from '../useLibraryFetch';

describe('useLibraryFetch', () => {
  it('returns fetchPage, fetchFolderCounts functions', () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), range: vi.fn().mockReturnThis(), ilike: vi.fn().mockReturnThis(), not: vi.fn().mockReturnThis(), rpc: vi.fn() }),
      rpc: vi.fn().mockResolvedValue({ data: {}, error: null }),
    };
    const { result } = renderHook(() =>
      useLibraryFetch({ supabase: mockSupabase as any })
    );
    expect(typeof result.current.fetchPage).toBe('function');
    expect(typeof result.current.fetchFolderCounts).toBe('function');
  });
});
