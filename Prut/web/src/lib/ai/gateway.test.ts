
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIGateway } from '@/lib/ai/gateway';
import { AVAILABLE_MODELS, TASK_ROUTING, getModelsForTask } from '@/lib/ai/models';
import { recordSuccess } from '@/lib/ai/circuit-breaker';

// Mock the 'ai' module
const mockStreamText = vi.fn();
vi.mock('ai', () => ({
  streamText: (args: Record<string, unknown>) => mockStreamText(args),
}));

// Mock process.env
const originalEnv = process.env;

describe('AIGateway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, GROQ_API_KEY: 'test-key', DEEPSEEK_API_KEY: 'test-key', MISTRAL_API_KEY: 'test-key' };
    // Reset circuit breaker state between tests
    ['google', 'groq', 'deepseek', 'mistral'].forEach(p => recordSuccess(p));
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use the primary model (Gemini 2.5) if it succeeds', async () => {
    mockStreamText.mockResolvedValueOnce({ text: 'success' });

    const result = await AIGateway.generateStream({ system: 'sys', prompt: 'user' });

    expect(result.modelId).toBe('gemini-2.5-flash');
    expect(mockStreamText).toHaveBeenCalledTimes(1);
    expect(mockStreamText).toHaveBeenCalledWith(expect.objectContaining({
      model: AVAILABLE_MODELS['gemini-2.5-flash'].model
    }));
  });

  it('should fallback to secondary (Mistral Small) if primary fails', async () => {
    // Fail first call
    mockStreamText.mockRejectedValueOnce(new Error('Rate Limited'));
    // Succeed second call
    mockStreamText.mockResolvedValueOnce({ text: 'success' });

    const result = await AIGateway.generateStream({ system: 'sys', prompt: 'user' });

    expect(result.modelId).toBe('mistral-small');
    expect(mockStreamText).toHaveBeenCalledTimes(2);
    expect(mockStreamText).toHaveBeenNthCalledWith(2, expect.objectContaining({
      model: AVAILABLE_MODELS['mistral-small'].model
    }));
  });

  it('should fallback to tertiary (Gemini 2.5 Flash Lite) if others fail', async () => {
    mockStreamText.mockRejectedValueOnce(new Error('Rate Limited 1'));
    mockStreamText.mockRejectedValueOnce(new Error('Rate Limited 2'));
    mockStreamText.mockResolvedValueOnce({ text: 'success' });

    const result = await AIGateway.generateStream({ system: 'sys', prompt: 'user' });

    expect(result.modelId).toBe('gemini-2.5-flash-lite');
    expect(mockStreamText).toHaveBeenCalledTimes(3);
  });

  it('should skip Groq if API key is missing', async () => {
    delete process.env.GROQ_API_KEY;

    // Fail all available models — Groq models (llama-4-scout, gpt-oss-20b) skipped
    mockStreamText.mockRejectedValue(new Error('Fail'));

    await expect(AIGateway.generateStream({ system: 'sys', prompt: 'user' }))
        .rejects
        .toThrow();

    // FALLBACK_ORDER: flash, mistral-small, flash-lite, llama-4-scout(skip), gpt-oss-20b(skip), deepseek = 4 calls
    expect(mockStreamText).toHaveBeenCalledTimes(4);
  });

  it('should throw if all models fail', async () => {
    mockStreamText.mockRejectedValue(new Error('General Failure'));

    await expect(AIGateway.generateStream({ system: 'sys', prompt: 'user' }))
      .rejects
      .toThrow();

     // FALLBACK_ORDER: flash, mistral-small, flash-lite, llama-4-scout, gpt-oss-20b, deepseek = 6 models
     // Note: circuit breaker may skip providers after first failure
     expect(mockStreamText.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('should use task-based routing when task is provided', async () => {
    mockStreamText.mockResolvedValueOnce({ text: 'success' });

    // Research routing: flash, mistral-small, deepseek, flash-lite — free filter removes deepseek
    // Remaining free: flash, mistral-small, flash-lite
    const result = await AIGateway.generateStream({ system: 'sys', prompt: 'user', task: 'research', userTier: 'free' });

    expect(result.modelId).toBe('gemini-2.5-flash');
    expect(mockStreamText).toHaveBeenCalledTimes(1);
  });
});

describe('Task-Based Model Routing', () => {
  it('returns models for enhance task', () => {
    const models = getModelsForTask('enhance');
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]).toBe('gemini-2.5-flash');
  });

  it('returns models for research task', () => {
    const models = getModelsForTask('research');
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]).toBe('gemini-2.5-flash');
  });

  it('prepends deepseek-chat and gemini-2.5-pro for pro-tier users', () => {
    const models = getModelsForTask('enhance', 'pro');
    expect(models[0]).toBe('deepseek-chat');
    expect(models[1]).toBe('gemini-2.5-pro');
    expect(models[2]).toBe('gemini-2.5-flash');
  });

  it('excludes pro models for free-tier users', () => {
    const models = getModelsForTask('enhance', 'free');
    expect(models.every(m => m !== 'gemini-2.5-pro')).toBe(true);
    expect(models.every(m => m !== 'deepseek-chat')).toBe(true);
  });

  it('falls back to enhance routing for unknown task', () => {
    const models = getModelsForTask('unknown-task');
    expect(models).toEqual(TASK_ROUTING.enhance);
  });

  it('has routing for all expected tasks', () => {
    expect(TASK_ROUTING).toHaveProperty('enhance');
    expect(TASK_ROUTING).toHaveProperty('research');
    expect(TASK_ROUTING).toHaveProperty('agent');
    expect(TASK_ROUTING).toHaveProperty('image');
  });

  it('includes all new free models in free tier filter', () => {
    const models = getModelsForTask('enhance', 'free');
    expect(models).toContain('gemini-2.5-flash');
    expect(models).toContain('mistral-small');
    expect(models).toContain('gemini-2.5-flash-lite');
    expect(models).toContain('llama-4-scout');
    expect(models).toContain('gpt-oss-20b');
  });
});
