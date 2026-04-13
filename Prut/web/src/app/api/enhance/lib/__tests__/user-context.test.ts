import { describe, it, expect, vi } from 'vitest';
import { resolveUserContext } from '../user-context';

describe('resolveUserContext', () => {
  it('returns guest tier for undefined userId', async () => {
    const ctx = await resolveUserContext({ userId: undefined, queryClient: {} as any, isRefinement: false });
    expect(ctx.tier).toBe('guest');
    expect(ctx.isAdmin).toBe(false);
  });
});
