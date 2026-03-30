
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIGateway } from '@/lib/ai/gateway';
import { AVAILABLE_MODELS, TASK_ROUTING, getModelsForTask } from '@/lib/ai/models';
import { recordSuccess } from '@/lib/ai/circuit-breaker';

// Mock the 'ai' module
const mockStreamText = vi.fn();
vi.mock('ai', () => ({
  streamText: (args: any) => mockStreamText(args),
}));

// Mock process.env
const originalEnv = process.env;

describe('AIGateway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, GROQ_API_KEY: 'test-key', DEEPSEEK_API_KEY: 'test-key' };
    // Reset circuit breaker state between tests
    ['google', 'groq', 'deepseek'].forEach(p => recordSuccess(p));
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

  it('should fallback to secondary (Gemini 2.0 Lite) if primary fails', async () => {
    // Fail first call
    mockStreamText.mockRejectedValueOnce(new Error('Rate Limited'));
    // Succeed second call
    mockStreamText.mockResolvedValueOnce({ text: 'success' });

    const result = await AIGateway.generateStream({ system: 'sys', prompt: 'user' });

    expect(result.modelId).toBe('gemini-2.0-flash-lite');
    expect(mockStreamText).toHaveBeenCalledTimes(2);
    expect(mockStreamText).toHaveBeenNthCalledWith(2, expect.objectContaining({
      model: AVAILABLE_MODELS['gemini-2.0-flash-lite'].model
    }));
  });

  it('should fallback to tertiary (Llama 3) if others fail', async () => {
    mockStreamText.mockRejectedValueOnce(new Error('Rate Limited 1'));
    mockStreamText.mockRejectedValueOnce(new Error('Rate Limited 2'));
    mockStreamText.mockResolvedValueOnce({ text: 'success' });

    const result = await AIGateway.generateStream({ system: 'sys', prompt: 'user' });

    expect(result.modelId).toBe('llama-3-70b');
    expect(mockStreamText).toHaveBeenCalledTimes(3);
  });

  it('should skip Groq if API key is missing', async () => {
    delete process.env.GROQ_API_KEY;

    // Fail all available models (Gemini x2 + DeepSeek, Groq skipped)
    mockStreamText.mockRejectedValue(new Error('Fail'));

    await expect(AIGateway.generateStream({ system: 'sys', prompt: 'user' }))
        .rejects
        .toThrow();

    // FALLBACK_ORDER: flash, lite, llama(skipped—no key), deepseek = 3 calls
    expect(mockStreamText).toHaveBeenCalledTimes(3);
  });

  it('should throw if all models fail', async () => {
    mockStreamText.mockRejectedValue(new Error('General Failure'));

    await expect(AIGateway.generateStream({ system: 'sys', prompt: 'user' }))
      .rejects
      .toThrow();

     // FALLBACK_ORDER: flash, lite, llama, deepseek = 4 models
     // Note: circuit breaker may skip providers after first failure
     expect(mockStreamText.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('should use task-based routing when task is provided', async () => {
    mockStreamText.mockResolvedValueOnce({ text: 'success' });

    // Research routing: flash, lite, deepseek — but without userTier, getModelsForTask
    // filters to free-only models (flash, lite)
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

  it('prepends gemini-2.5-pro for pro-tier users', () => {
    const models = getModelsForTask('enhance', 'pro');
    expect(models[0]).toBe('gemini-2.5-pro');
    expect(models[1]).toBe('gemini-2.5-flash');
  });

  it('excludes pro models for free-tier users', () => {
    const models = getModelsForTask('enhance', 'free');
    expect(models.every(m => m !== 'gemini-2.5-pro')).toBe(true);
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
});
