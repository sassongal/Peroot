import { describe, it, expect } from 'vitest';
import { PLAN_CONTEXT_LIMITS, getContextLimits } from '../plans';

describe('PLAN_CONTEXT_LIMITS', () => {
  it('has free and pro tiers with expected shape', () => {
    expect(PLAN_CONTEXT_LIMITS.free.perAttachment).toBe(3_000);
    expect(PLAN_CONTEXT_LIMITS.free.total).toBe(8_000);
    expect(PLAN_CONTEXT_LIMITS.free.maxFiles).toBe(1);
    expect(PLAN_CONTEXT_LIMITS.free.extractionsPerDay).toBe(5);
    expect(PLAN_CONTEXT_LIMITS.free.jinaFallback).toBe(false);
    expect(PLAN_CONTEXT_LIMITS.pro.perAttachment).toBe(12_000);
    expect(PLAN_CONTEXT_LIMITS.pro.extractionsPerDay).toBe(100);
    expect(PLAN_CONTEXT_LIMITS.pro.jinaFallback).toBe(true);
  });
  it('getContextLimits maps plan tier', () => {
    expect(getContextLimits('free')).toBe(PLAN_CONTEXT_LIMITS.free);
    expect(getContextLimits('pro')).toBe(PLAN_CONTEXT_LIMITS.pro);
  });
});
