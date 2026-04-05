// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// jsdom in vitest provides a localStorage object without getItem/setItem methods.
// Use vi.hoisted so the mock is applied before static imports evaluate.
vi.hoisted(() => {
  const store: Record<string, string> = {};
  const localStorageMock = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
  Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });
});

import { usePromptWorkflow, promptCache } from '../usePromptWorkflow';
import { CapabilityMode } from '@/lib/capability-mode';

describe('usePromptWorkflow', () => {
  it('initializes with default state', () => {
    const { result } = renderHook(() => usePromptWorkflow());
    expect(result.current.state.input).toBe('');
    expect(result.current.state.completion).toBe('');
    expect(result.current.state.isLoading).toBe(false);
    expect(result.current.state.streamPhase).toBe('idle');
    expect(result.current.state.selectedCategory).toBe('General');
    expect(result.current.state.selectedTone).toBe('Professional');
  });

  it('handles SET_INPUT action', () => {
    const { result } = renderHook(() => usePromptWorkflow());
    act(() => result.current.dispatch({ type: 'SET_INPUT', payload: 'test prompt' }));
    expect(result.current.state.input).toBe('test prompt');
  });

  it('handles START_STREAM action', () => {
    const { result } = renderHook(() => usePromptWorkflow());
    act(() => result.current.dispatch({ type: 'START_STREAM' }));
    expect(result.current.state.isLoading).toBe(true);
    expect(result.current.state.completion).toBe('');
    expect(result.current.state.streamPhase).toBe('sending');
    expect(result.current.state.error).toBeNull();
  });

  it('handles STREAM_CHUNK action', () => {
    const { result } = renderHook(() => usePromptWorkflow());
    act(() => result.current.dispatch({ type: 'START_STREAM' }));
    act(() => result.current.dispatch({ type: 'STREAM_CHUNK', payload: 'Hello ' }));
    expect(result.current.state.completion).toBe('Hello ');
    expect(result.current.state.streamPhase).toBe('writing');
    act(() => result.current.dispatch({ type: 'STREAM_CHUNK', payload: 'World' }));
    expect(result.current.state.completion).toBe('Hello World');
  });

  it('handles STREAM_DONE action', () => {
    const { result } = renderHook(() => usePromptWorkflow());
    act(() => result.current.dispatch({ type: 'START_STREAM' }));
    act(() => result.current.dispatch({ type: 'STREAM_CHUNK', payload: 'result' }));
    act(() => result.current.dispatch({ type: 'STREAM_DONE' }));
    expect(result.current.state.isLoading).toBe(false);
    expect(result.current.state.streamPhase).toBe('done');
    expect(result.current.state.completion).toBe('result');
  });

  it('handles SET_ERROR action', () => {
    const { result } = renderHook(() => usePromptWorkflow());
    act(() => result.current.dispatch({ type: 'SET_ERROR', payload: 'Something failed' }));
    expect(result.current.state.error).toBe('Something failed');
    expect(result.current.state.isLoading).toBe(false);
    expect(result.current.state.streamPhase).toBe('idle');
  });

  it('handles RESET action', () => {
    const { result } = renderHook(() => usePromptWorkflow());
    act(() => result.current.dispatch({ type: 'SET_INPUT', payload: 'test' }));
    act(() => result.current.dispatch({ type: 'START_STREAM' }));
    act(() => result.current.dispatch({ type: 'STREAM_CHUNK', payload: 'data' }));
    act(() => result.current.dispatch({ type: 'RESET' }));
    expect(result.current.state.input).toBe('');
    expect(result.current.state.completion).toBe('');
    expect(result.current.state.isLoading).toBe(false);
    expect(result.current.state.streamPhase).toBe('idle');
  });

  it('handles SET_CATEGORY action', () => {
    const { result } = renderHook(() => usePromptWorkflow());
    act(() => result.current.dispatch({ type: 'SET_CATEGORY', payload: 'Creative' }));
    expect(result.current.state.selectedCategory).toBe('Creative');
  });

  it('handles SET_CAPABILITY action', () => {
    const { result } = renderHook(() => usePromptWorkflow());
    act(() => result.current.dispatch({ type: 'SET_CAPABILITY', payload: CapabilityMode.DEEP_RESEARCH }));
    expect(result.current.state.selectedCapability).toBe(CapabilityMode.DEEP_RESEARCH);
  });

  it('handles SET_QUESTIONS action', () => {
    const { result } = renderHook(() => usePromptWorkflow());
    const questions = [{ id: 1, question: 'What tone?', description: '', examples: [] }];
    act(() => result.current.dispatch({ type: 'SET_QUESTIONS', payload: questions }));
    expect(result.current.state.questions).toEqual(questions);
  });

  it('handles SET_DETECTED_CATEGORY action', () => {
    const { result } = renderHook(() => usePromptWorkflow());
    act(() => result.current.dispatch({ type: 'SET_DETECTED_CATEGORY', payload: 'Tech' }));
    expect(result.current.state.detectedCategory).toBe('Tech');
  });

  it('handles SET_TONE action', () => {
    const { result } = renderHook(() => usePromptWorkflow());
    act(() => result.current.dispatch({ type: 'SET_TONE', payload: 'Casual' }));
    expect(result.current.state.selectedTone).toBe('Casual');
  });

  it('handles SET_QUESTION_ANSWER action', () => {
    const { result } = renderHook(() => usePromptWorkflow());
    act(() => result.current.dispatch({ type: 'SET_QUESTION_ANSWER', payload: { id: 1, answer: 'formal' } }));
    expect(result.current.state.questionAnswers).toEqual({ 1: 'formal' });
    act(() => result.current.dispatch({ type: 'SET_QUESTION_ANSWER', payload: { id: 2, answer: 'short' } }));
    expect(result.current.state.questionAnswers).toEqual({ 1: 'formal', 2: 'short' });
  });

  it('handles SET_VARIABLE_VALUES action', () => {
    const { result } = renderHook(() => usePromptWorkflow());
    act(() => result.current.dispatch({ type: 'SET_VARIABLE_VALUES', payload: { name: 'John', role: 'dev' } }));
    expect(result.current.state.variableValues).toEqual({ name: 'John', role: 'dev' });
  });

  it('handles SET_COPIED action', () => {
    const { result } = renderHook(() => usePromptWorkflow());
    act(() => result.current.dispatch({ type: 'SET_COPIED', payload: true }));
    expect(result.current.state.copied).toBe(true);
    act(() => result.current.dispatch({ type: 'SET_COPIED', payload: false }));
    expect(result.current.state.copied).toBe(false);
  });

  it('handles INCREMENT_ITERATION action', () => {
    const { result } = renderHook(() => usePromptWorkflow());
    expect(result.current.state.iterationCount).toBe(0);
    act(() => result.current.dispatch({ type: 'INCREMENT_ITERATION' }));
    expect(result.current.state.iterationCount).toBe(1);
    act(() => result.current.dispatch({ type: 'INCREMENT_ITERATION' }));
    expect(result.current.state.iterationCount).toBe(2);
  });

  it('START_STREAM resets copied flag', () => {
    const { result } = renderHook(() => usePromptWorkflow());
    act(() => result.current.dispatch({ type: 'SET_COPIED', payload: true }));
    expect(result.current.state.copied).toBe(true);
    act(() => result.current.dispatch({ type: 'START_STREAM' }));
    expect(result.current.state.copied).toBe(false);
  });
});

describe('promptCache', () => {
  it('stores and retrieves cached responses', () => {
    promptCache.set('test-key', 'cached result');
    expect(promptCache.get('test-key')).toBe('cached result');
  });

  it('returns undefined for missing keys', () => {
    expect(promptCache.get('nonexistent')).toBeUndefined();
  });

  it('evicts oldest entry when max size reached', () => {
    promptCache.clear();
    for (let i = 0; i < 21; i++) {
      promptCache.set(`key-${i}`, `value-${i}`);
    }
    expect(promptCache.get('key-0')).toBeUndefined();
    expect(promptCache.get('key-20')).toBe('value-20');
  });
});
