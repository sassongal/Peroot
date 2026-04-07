/**
 * json-examples regression test.
 *
 * Guarantees that every few-shot example in src/lib/engines/json-examples.ts
 * is (a) valid parseable JSON, (b) matches the platform's expected schema
 * shape, and (c) the exported `getJsonExamplesBlock` helper returns a
 * non-empty block for every known JSON platform key.
 *
 * If any assertion fails after editing json-examples.ts, the offending
 * example string is almost certainly malformed JSON — run `node -e` on it
 * locally to see the exact syntax error.
 */

import { describe, it, expect } from 'vitest';
import { getJsonExamplesBlock, __TEST_EXAMPLES } from '../json-examples';

describe('json-examples', () => {
  it('every example string parses as valid JSON', () => {
    for (const [platformKey, examples] of Object.entries(__TEST_EXAMPLES)) {
      for (const ex of examples) {
        try {
          JSON.parse(ex.output);
        } catch (err) {
          throw new Error(
            `${platformKey}/"${ex.concept}" is not valid JSON: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      }
    }
  });

  it('stable-diffusion-json examples contain every required SDXL field', () => {
    const required = [
      'prompt',
      'negative_prompt',
      'width',
      'height',
      'steps',
      'cfg_scale',
      'sampler_name',
    ] as const;
    for (const ex of __TEST_EXAMPLES['stable-diffusion-json']!) {
      const parsed = JSON.parse(ex.output) as Record<string, unknown>;
      for (const field of required) {
        expect(parsed, `${ex.concept} missing "${field}"`).toHaveProperty(field);
      }
      expect(typeof parsed.prompt).toBe('string');
      expect((parsed.prompt as string).length).toBeGreaterThan(50);
    }
  });

  it('nanobanana-json examples contain every required Gemini Image section', () => {
    const requiredTopLevel = [
      'subject',
      'camera',
      'lighting',
      'style',
      'environment',
      'aspect_ratio',
      'constraints',
    ] as const;
    for (const ex of __TEST_EXAMPLES['nanobanana-json']!) {
      const parsed = JSON.parse(ex.output) as Record<string, unknown>;
      for (const field of requiredTopLevel) {
        expect(parsed, `${ex.concept} missing "${field}"`).toHaveProperty(field);
      }
      const subject = parsed.subject as Record<string, unknown>;
      expect(subject).toHaveProperty('description');
      expect(typeof subject.description).toBe('string');
      expect(Array.isArray(parsed.constraints)).toBe(true);
    }
  });

  it('getJsonExamplesBlock returns a non-empty block for known platform keys', () => {
    for (const key of Object.keys(__TEST_EXAMPLES)) {
      const block = getJsonExamplesBlock(key);
      expect(block.length).toBeGreaterThan(100);
      expect(block).toContain('CONCEPT:');
      expect(block).toContain('OUTPUT:');
      expect(block).toContain('valid parseable JSON');
    }
  });

  it('getJsonExamplesBlock returns empty string for unknown platform keys', () => {
    expect(getJsonExamplesBlock('midjourney')).toBe('');
    expect(getJsonExamplesBlock('dalle')).toBe('');
    expect(getJsonExamplesBlock('unknown-platform')).toBe('');
  });

  it('limit parameter caps the number of examples included', () => {
    const block = getJsonExamplesBlock('stable-diffusion-json', 1);
    const conceptCount = (block.match(/CONCEPT:/g) ?? []).length;
    expect(conceptCount).toBe(1);
  });
});
