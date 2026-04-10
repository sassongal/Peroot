/**
 * Gateway pickDefaults clamp + preset regression tests.
 *
 * Locks in two invariants that the code review flagged as risks:
 *
 * 1. A caller cannot exceed HARD_MAX_OUTPUT_TOKENS by passing a huge
 *    userMax override. Prevents cost amplification from internal bugs
 *    or malicious internal callers that might otherwise pass something
 *    like maxOutputTokens: 999999.
 *
 * 2. Each task's preset temperature/maxOutputTokens stays stable across
 *    refactors — image/video stay at 0.5 temp + 16384 tokens (raised from
 *    8192 after the thinking-token truncation incident, see
 *    buildProviderOptions), chain stays at 0.4 temp + 3072 tokens. If
 *    someone accidentally tweaks a preset while "cleaning up" the
 *    gateway, this test fails loudly.
 *
 * pickDefaults is module-private but re-exported with an @internal JSDoc
 * tag specifically so this test can call it directly. Do NOT import it
 * from application code — use the gateway methods instead.
 */

import { describe, it, expect } from 'vitest';
import { pickDefaults, buildProviderOptions, filterModelsForEstimatedInput } from '../gateway';

describe('gateway pickDefaults — hard clamp', () => {
  it('clamps an egregious userMax override to 16384', () => {
    const result = pickDefaults('image', 999_999);
    expect(result.maxOutputTokens).toBe(16384);
  });

  it('clamps userMax override for every task type', () => {
    for (const task of ['image', 'video', 'research', 'enhance', 'agent', 'chain', 'classify']) {
      const result = pickDefaults(task, 500_000);
      expect(result.maxOutputTokens, `task=${task}`).toBe(16384);
    }
  });

  it('honors a small userMax override below the preset', () => {
    const result = pickDefaults('image', 2048);
    expect(result.maxOutputTokens).toBe(2048);
  });

  it('honors a userMax override equal to the hard cap', () => {
    const result = pickDefaults('image', 16384);
    expect(result.maxOutputTokens).toBe(16384);
  });

  it('honors a userMax override for the enhance task (Refine path)', () => {
    // Regression: Refine requests hit the enhance task but need more than
    // the 4096 default because the engine re-emits the full enhanced prompt
    // plus [GENIUS_QUESTIONS] + [PROMPT_TITLE] blocks. The API route passes
    // maxOutputTokens: 8192 for isRefinement — this test locks in that the
    // gateway actually honors the override (and does not clamp it back to
    // the enhance preset of 4096).
    const result = pickDefaults('enhance', 8192);
    expect(result.maxOutputTokens).toBe(8192);
    expect(result.maxOutputTokens).toBeGreaterThan(4096);
  });
});

describe('gateway pickDefaults — presets', () => {
  it('image task defaults to 16384 tokens and 0.5 temp', () => {
    expect(pickDefaults('image')).toEqual({ maxOutputTokens: 16384, temperature: 0.5 });
  });

  it('video task defaults to 16384 tokens and 0.5 temp', () => {
    expect(pickDefaults('video')).toEqual({ maxOutputTokens: 16384, temperature: 0.5 });
  });

  it('research task defaults to 16384 tokens and 0.6 temp', () => {
    // Raised from 10240 → 16384: Hebrew + citations expand tokens; matches
    // HARD_MAX so research can use full output budget without silent cuts.
    expect(pickDefaults('research')).toEqual({ maxOutputTokens: 16384, temperature: 0.6 });
  });

  it('enhance task defaults to 8192 tokens and 0.7 temp', () => {
    // Lifted from 4096 after Gemini 2.5 Flash thinking tokens were
    // observed consuming ~2500 of the budget for complex Standard prompts,
    // leaving too little for the enhanced prompt + trailing marker blocks.
    expect(pickDefaults('enhance')).toEqual({ maxOutputTokens: 8192, temperature: 0.7 });
  });

  it('agent task defaults to 16384 tokens and 0.7 temp', () => {
    // Lifted 8192 → 16384 after a live test showed Gemini reasoning alone
    // consumed 5452 tokens on the agent template (vs ~2500 for enhance).
    // With the 9-section agent architecture + mandatory [PROMPT_TITLE] +
    // [GENIUS_QUESTIONS] trailer the model needs 5-6K output tokens on top
    // of reasoning, which blew past the 8192 ceiling mid-instruction and
    // silently dropped the trailer markers. See gateway.ts comment.
    expect(pickDefaults('agent')).toEqual({ maxOutputTokens: 16384, temperature: 0.7 });
  });

  it('chain task defaults to 3072 tokens and 0.4 temp', () => {
    // Consumed by src/app/api/chain/generate/route.ts — if this preset
    // changes, that route's behavior changes silently. Bump both in sync.
    expect(pickDefaults('chain')).toEqual({ maxOutputTokens: 3072, temperature: 0.4 });
  });

  it('classify task defaults to 256 tokens and 0.2 temp', () => {
    // Lightweight internal task (category suggestion, tagging). Tiny JSON
    // output, low temperature for determinism.
    expect(pickDefaults('classify')).toEqual({ maxOutputTokens: 256, temperature: 0.2 });
  });

  it('unknown task falls back to the enhance preset', () => {
    expect(pickDefaults('bogus-task-name')).toEqual({ maxOutputTokens: 8192, temperature: 0.7 });
  });

  it('missing task falls back to the enhance preset', () => {
    expect(pickDefaults()).toEqual({ maxOutputTokens: 8192, temperature: 0.7 });
  });
});

describe('gateway pickDefaults — caller temperature override', () => {
  it('honors caller-provided temperature', () => {
    const result = pickDefaults('image', undefined, 0.1);
    expect(result.temperature).toBe(0.1);
  });

  it('does not honor undefined temperature (preset wins)', () => {
    const result = pickDefaults('image', undefined, undefined);
    expect(result.temperature).toBe(0.5);
  });
});

describe('gateway buildProviderOptions — disables Gemini thinking', () => {
  // Root cause of the JSON truncation incident: Gemini 2.5 Flash's
  // reasoning tokens count against maxOutputTokens. For image/video JSON
  // tasks thinking consumed 700-1000+ tokens out of an 8K budget, leaving
  // only 60-100 tokens of actual JSON output (~130-180 chars, mid-string).
  // These tests lock in the fix: thinkingBudget: 0 for long-output tasks.

  it('returns thinkingBudget: 0 for image task', () => {
    expect(buildProviderOptions('image')).toEqual({
      google: { thinkingConfig: { thinkingBudget: 0 } },
    });
  });

  it('returns thinkingBudget: 0 for video task', () => {
    expect(buildProviderOptions('video')).toEqual({
      google: { thinkingConfig: { thinkingBudget: 0 } },
    });
  });

  it('returns thinkingBudget: 0 for chain task', () => {
    expect(buildProviderOptions('chain')).toEqual({
      google: { thinkingConfig: { thinkingBudget: 0 } },
    });
  });

  it('returns thinkingBudget: 0 for classify task', () => {
    expect(buildProviderOptions('classify')).toEqual({
      google: { thinkingConfig: { thinkingBudget: 0 } },
    });
  });

  it('returns undefined for enhance task (reasoning stays on)', () => {
    expect(buildProviderOptions('enhance')).toBeUndefined();
  });

  it('returns undefined for research task (reasoning stays on)', () => {
    expect(buildProviderOptions('research')).toBeUndefined();
  });

  it('returns undefined for agent task (reasoning stays on)', () => {
    expect(buildProviderOptions('agent')).toBeUndefined();
  });

  it('returns undefined for unknown task', () => {
    expect(buildProviderOptions('bogus-task-name')).toBeUndefined();
  });

  it('returns undefined when task is missing', () => {
    expect(buildProviderOptions()).toBeUndefined();
  });
});

describe('filterModelsForEstimatedInput', () => {
  it('keeps full chain when input is small', () => {
    const chain = ['gemini-2.5-flash', 'gpt-oss-20b'] as const;
    const out = filterModelsForEstimatedInput([...chain], 1000);
    expect(out).toEqual(['gemini-2.5-flash', 'gpt-oss-20b']);
  });

  it('drops gpt-oss-20b when estimated input exceeds safe window for 32k context', () => {
    const chain = [
      'gemini-2.5-flash',
      'mistral-small',
      'gpt-oss-20b',
    ] as const;
    // 20480 * 4 = 81920 chars — reserve ~20k tokens for output → gpt-oss cannot fit
    const out = filterModelsForEstimatedInput([...chain], 20480);
    expect(out).not.toContain('gpt-oss-20b');
    expect(out).toContain('gemini-2.5-flash');
  });
});
