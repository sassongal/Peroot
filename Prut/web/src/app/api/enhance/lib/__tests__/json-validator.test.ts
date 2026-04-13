import { describe, it, expect } from 'vitest';
import { validateJsonOutput } from '../json-validator';

describe('validateJsonOutput', () => {
  it('returns valid for clean JSON', () => {
    expect(validateJsonOutput('{"a":1}')).toEqual({ jsonValid: true, jsonError: null });
  });
  it('strips PROMPT_TITLE before parsing', () => {
    expect(validateJsonOutput('{"ok":true}\n[PROMPT_TITLE]title[/PROMPT_TITLE]').jsonValid).toBe(true);
  });
  it('strips GENIUS_QUESTIONS trailing block', () => {
    expect(validateJsonOutput('{"ok":true}\n[GENIUS_QUESTIONS][{"id":1}]').jsonValid).toBe(true);
  });
  it('strips markdown code fences', () => {
    expect(validateJsonOutput('```json\n{"ok":true}\n```').jsonValid).toBe(true);
  });
  it('returns invalid for non-JSON', () => {
    const r = validateJsonOutput('not json');
    expect(r.jsonValid).toBe(false);
    expect(r.jsonError).toBeTruthy();
  });
});
