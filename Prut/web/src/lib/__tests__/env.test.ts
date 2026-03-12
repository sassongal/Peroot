import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('validateEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('does not throw when all required vars are present', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    // In node (server) context, SUPABASE_SERVICE_ROLE_KEY is also required
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    const { validateEnv } = await import('@/lib/env');
    expect(() => validateEnv()).not.toThrow();
  });

  it('throws when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    const { validateEnv } = await import('@/lib/env');
    expect(() => validateEnv()).toThrow();
  });

  it('throws when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    const { validateEnv } = await import('@/lib/env');
    expect(() => validateEnv()).toThrow();
  });

  it('throws when SUPABASE_SERVICE_ROLE_KEY is missing in server context', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { validateEnv } = await import('@/lib/env');
    // In node environment (no window), service role key is required
    expect(() => validateEnv()).toThrow();
  });
});
