import { describe, it, expect } from 'vitest';
import { selectEngineModel, SMALL_CONTEXT_THRESHOLD } from '../context-router';
import type { ContextBlock } from '@/lib/context/engine/types';

function blk(tokens: number): ContextBlock {
  return {
    id: 'x', type: 'file', sha256: 'h', stage: 'ready',
    display: {
      title: '', documentType: 'generic', summary: '',
      keyFacts: [], entities: [], rawText: '', metadata: {},
    },
    injected: { header: '', body: '', tokenCount: tokens },
  };
}

describe('selectEngineModel', () => {
  it('returns flash-lite on no blocks', () => {
    expect(selectEngineModel({ blocks: [] })).toBe('gemini-2.5-flash-lite');
  });
  it('returns flash-lite when under threshold', () => {
    expect(selectEngineModel({ blocks: [blk(500), blk(1000)] })).toBe('gemini-2.5-flash-lite');
  });
  it('returns flash at exactly threshold+1', () => {
    expect(selectEngineModel({ blocks: [blk(SMALL_CONTEXT_THRESHOLD + 1)] })).toBe('gemini-2.5-flash');
  });
  it('returns flash on large context', () => {
    expect(selectEngineModel({ blocks: [blk(10_000)] })).toBe('gemini-2.5-flash');
  });
});
