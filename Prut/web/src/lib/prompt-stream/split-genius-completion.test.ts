import { describe, expect, it } from 'vitest';
import {
  splitCompletionAndQuestions,
  stripGeniusQuestionsForDisplay,
} from './split-genius-completion';

describe('stripGeniusQuestionsForDisplay', () => {
  it('hides from first newline-boundary marker', () => {
    const raw = 'Hello world\n[GENIUS_QUESTIONS][{"id":1}]';
    expect(stripGeniusQuestionsForDisplay(raw)).toBe('Hello world');
  });

  it('does not strip when marker appears mid-line (false positive)', () => {
    const raw = 'Use [GENIUS_QUESTIONS] format for JSON';
    expect(stripGeniusQuestionsForDisplay(raw)).toBe(raw);
  });
});

describe('splitCompletionAndQuestions', () => {
  it('splits on last newline-boundary marker', () => {
    const raw = 'Prompt line one\nPrompt two\n[GENIUS_QUESTIONS][{"id":1,"question":"q"}]';
    const { body, questionsPart } = splitCompletionAndQuestions(raw);
    expect(body).toBe('Prompt line one\nPrompt two');
    expect(questionsPart.trim().startsWith('[')).toBe(true);
  });

  it('does not split when only mid-body marker exists', () => {
    const raw = 'Mid [GENIUS_QUESTIONS] echo without newline before marker';
    const { body, questionsPart } = splitCompletionAndQuestions(raw);
    expect(body).toBe(raw);
    expect(questionsPart).toBe('');
  });

  it('legacy: BOF marker still splits', () => {
    const raw = '[GENIUS_QUESTIONS][]';
    const { body, questionsPart } = splitCompletionAndQuestions(raw);
    expect(body).toBe('');
    expect(questionsPart.trim()).toBe('[]');
  });
});
