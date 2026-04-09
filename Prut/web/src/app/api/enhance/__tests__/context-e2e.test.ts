// src/app/api/enhance/__tests__/context-e2e.test.ts
import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Chainable Supabase query builder mock
// ---------------------------------------------------------------------------
function mockChain(resolveValue: unknown = { data: null }) {
  const builder: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'in', 'order', 'limit', 'not', 'insert', 'update', 'maybeSingle', 'single', 'head'];
  for (const m of methods) builder[m] = vi.fn().mockReturnValue(builder);
  builder.then = (resolve: (v: unknown) => void) => { resolve(resolveValue); return Promise.resolve(resolveValue); };
  return builder;
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
function makeSupabaseFrom(table: string) {
  if (table === 'profiles') return mockChain({ data: { plan_tier: 'pro' } });
  if (table === 'history') return mockChain({ data: [] });
  if (table === 'user_style_personality') return mockChain({ data: null });
  if (table === 'user_roles') return mockChain({ data: null });
  if (table === 'activity_logs') return mockChain({ data: null, count: 5 });
  return mockChain({ data: null });
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: (table: string) => makeSupabaseFrom(table),
    rpc: () => mockChain({ data: null }),
  }),
}));
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: (table: string) => makeSupabaseFrom(table),
    rpc: () => mockChain({ data: null }),
  }),
}));

const generateStreamMock = vi.fn(async (_args: unknown) => ({
  result: { toTextStreamResponse: () => new Response('ok') },
  modelId: 'gemini-2.5-flash',
}));
vi.mock('@/lib/ai/gateway', () => ({
  AIGateway: { generateStream: (args: unknown) => generateStreamMock(args) },
}));

vi.mock('@/lib/ai/concurrency', () => {
  class ConcurrencyError extends Error {
    constructor(msg: string) { super(msg); this.name = 'ConcurrencyError'; }
  }
  return { ConcurrencyError };
});
vi.mock('@/lib/services/credit-service', () => ({
  checkAndDecrementCredits: async () => ({ allowed: true, remaining: 5 }),
  refundCredit: async () => {},
}));
vi.mock('@/lib/ratelimit', () => ({
  checkRateLimit: async () => ({ success: true, reset: 0 }),
}));
vi.mock('@/lib/api-auth', () => ({ validateApiKey: async () => ({ valid: false }) }));
vi.mock('@/lib/jobs/queue', () => ({ enqueueJob: async () => {} }));
vi.mock('@/lib/admin/track-api-usage', () => ({ trackApiUsage: () => {} }));
vi.mock('@/lib/ai/enhance-cache', () => ({
  buildCacheKey: () => null,
  getCached: async () => null,
  setCached: async () => {},
}));
vi.mock('@/lib/ai/inflight-lock', () => ({
  acquireInflightLock: async () => ({ acquired: true, release: async () => {} }),
}));
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return { ...actual, after: (fn: () => void) => fn() };
});

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------
import { POST } from '../route';
import type { ContextBlock } from '@/lib/context/engine/types';

const block: ContextBlock = {
  id: 'b1', type: 'file', sha256: 'h', stage: 'ready',
  display: {
    title: 'contract.pdf', documentType: 'חוזה משפטי',
    summary: 'חוזה שירותים.', keyFacts: ['שווי 45000 ₪'],
    entities: [{ name: 'אלפא בע"מ', type: 'org' }],
    rawText: '...', metadata: { pages: 12 },
  },
  injected: { header: '', body: '', tokenCount: 250 },
};

describe('POST /api/enhance with context', () => {
  it('injects role block, facts, and usage rules into the model system prompt', async () => {
    const res = await POST(new Request('http://t', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'תסכם את החוזה', context: [block] }),
    }) as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
    const calls = generateStreamMock.mock.calls as unknown as Array<[{ system: string }]>;
    expect(calls.length).toBeGreaterThan(0);
    const args = calls[0][0];
    expect(args.system).toContain('יועץ משפטי בכיר');
    expect(args.system).toContain('שווי 45000');
    expect(args.system).toContain('הנחיות שימוש בקונטקסט');
  });
});
