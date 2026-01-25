
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIGateway } from '@/lib/ai/gateway';
import { AVAILABLE_MODELS } from '@/lib/ai/models';

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
    process.env = { ...originalEnv, GROQ_API_KEY: 'test-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use the primary model (Gemini 2.0) if it succeeds', async () => {
    mockStreamText.mockResolvedValueOnce({ text: 'success' });

    const result = await AIGateway.generateStream({ system: 'sys', prompt: 'user' });

    expect(result.modelId).toBe('gemini-2.0-flash');
    expect(mockStreamText).toHaveBeenCalledTimes(1);
    expect(mockStreamText).toHaveBeenCalledWith(expect.objectContaining({
      model: AVAILABLE_MODELS['gemini-2.0-flash'].model
    }));
  });

  it('should fallback to secondary (Gemini 1.5) if primary fails', async () => {
    // Fail first call
    mockStreamText.mockRejectedValueOnce(new Error('Rate Limited'));
    // Succeed second call
    mockStreamText.mockResolvedValueOnce({ text: 'success' });

    const result = await AIGateway.generateStream({ system: 'sys', prompt: 'user' });

    expect(result.modelId).toBe('gemini-1.5-flash');
    expect(mockStreamText).toHaveBeenCalledTimes(2);
    expect(mockStreamText).toHaveBeenNthCalledWith(2, expect.objectContaining({
      model: AVAILABLE_MODELS['gemini-1.5-flash'].model
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
    
    // Fail first two models
    mockStreamText.mockRejectedValueOnce(new Error('Fail 1'));
    mockStreamText.mockRejectedValueOnce(new Error('Fail 2'));
    // Third call should NOT happen (Groq skipped) - so it throws

    await expect(AIGateway.generateStream({ system: 'sys', prompt: 'user' }))
        .rejects
        .toThrow();
        
    expect(mockStreamText).toHaveBeenCalledTimes(2); // Only Gemini models attempted
  });

  it('should throw if all models fail', async () => {
    mockStreamText.mockRejectedValue(new Error('General Failure'));

    await expect(AIGateway.generateStream({ system: 'sys', prompt: 'user' }))
      .rejects
      .toThrow('General Failure');
      
     // Should try all 3
     expect(mockStreamText).toHaveBeenCalledTimes(3);
  });
});
