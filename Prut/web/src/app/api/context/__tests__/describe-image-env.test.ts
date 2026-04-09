import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../describe-image/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { plan_tier: 'pro' } }) }) }) }),
  }),
}));
vi.mock('@/lib/ratelimit', () => ({ checkRateLimit: async () => ({ success: true }) }));

describe('describe-image env var', () => {
  const origKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key';
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }), { status: 200 })
    ) as unknown as typeof fetch;
  });
  afterEach(() => { process.env.GOOGLE_GENERATIVE_AI_API_KEY = origKey; });

  it('uses GOOGLE_GENERATIVE_AI_API_KEY and returns 200', async () => {
    const form = new FormData();
    form.set('image', new File([new Uint8Array([1, 2, 3])], 't.png', { type: 'image/png' }));
    const req = new Request('http://t', { method: 'POST', body: form });
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
  });
});
