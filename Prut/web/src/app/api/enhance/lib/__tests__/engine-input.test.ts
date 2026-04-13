import { describe, it, expect } from 'vitest';
import { buildEngineInput } from '../engine-input';
import { CapabilityMode } from '@/lib/capability-mode';

describe('buildEngineInput', () => {
  const base = { prompt: 'test', tone: 'Pro', category: 'כללי', mode: CapabilityMode.STANDARD, userId: 'u1', isGuest: false, isRefinement: false };

  it('returns empty userHistory when historyRes.data is null', () => {
    const result = buildEngineInput({ ...base, historyRes: { data: null }, personalityRes: { data: null } });
    expect(result.userHistory).toEqual([]);
    expect(result.prompt).toBe('test');
  });

  it('filters history rows with empty prompts', () => {
    const result = buildEngineInput({
      ...base,
      historyRes: { data: [{ title: 'A', prompt: 'hello', enhanced_prompt: 'enhanced' }, { title: 'B', prompt: '', enhanced_prompt: null }] },
      personalityRes: { data: null },
    });
    expect(result.userHistory).toHaveLength(1);
    expect(result.userHistory![0].prompt).toBe('hello');
  });

  it('maps personality data when present', () => {
    const result = buildEngineInput({
      ...base,
      historyRes: { data: null },
      personalityRes: { data: { style_tokens: ['formal'], personality_brief: 'brief', preferred_format: 'bullets' } },
    });
    expect(result.userPersonality?.tokens).toEqual(['formal']);
  });
});
