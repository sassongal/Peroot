'use client';

import { useReducer } from 'react';
import type { Question } from '@/lib/types';
import { CapabilityMode } from '@/lib/capability-mode';

// --- Types ---

export type StreamPhase = 'idle' | 'sending' | 'writing' | 'done';

export interface PromptState {
  input: string;
  completion: string;
  isLoading: boolean;
  streamPhase: StreamPhase;
  error: string | null;
  selectedCategory: string;
  selectedTone: string;
  selectedCapability: CapabilityMode;
  questions: Question[];
  detectedCategory: string;
  questionAnswers: Record<number, string>;
  variableValues: Record<string, string>;
  copied: boolean;
  iterationCount: number;
}

export type PromptAction =
  | { type: 'SET_INPUT'; payload: string }
  | { type: 'START_STREAM' }
  | { type: 'STREAM_CHUNK'; payload: string }
  | { type: 'STREAM_DONE' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESET' }
  | { type: 'SET_CATEGORY'; payload: string }
  | { type: 'SET_TONE'; payload: string }
  | { type: 'SET_CAPABILITY'; payload: CapabilityMode }
  | { type: 'SET_QUESTIONS'; payload: Question[] }
  | { type: 'SET_DETECTED_CATEGORY'; payload: string }
  | { type: 'SET_QUESTION_ANSWER'; payload: { id: number; answer: string } }
  | { type: 'SET_VARIABLE_VALUES'; payload: Record<string, string> }
  | { type: 'SET_COMPLETION'; payload: string }
  | { type: 'SET_COPIED'; payload: boolean }
  | { type: 'INCREMENT_ITERATION' }
  | { type: 'CLEAR_ANSWERS' };

// --- Initial State ---

const initialState: PromptState = {
  input: '',
  completion: '',
  isLoading: false,
  streamPhase: 'idle',
  error: null,
  selectedCategory: 'General',
  selectedTone: 'Professional',
  selectedCapability: CapabilityMode.STANDARD,
  questions: [],
  detectedCategory: '',
  questionAnswers: {},
  variableValues: {},
  copied: false,
  iterationCount: 0,
};

// --- Reducer ---

function promptReducer(state: PromptState, action: PromptAction): PromptState {
  switch (action.type) {
    case 'SET_INPUT':
      return { ...state, input: action.payload };

    case 'START_STREAM':
      return {
        ...state,
        isLoading: true,
        completion: '',
        streamPhase: 'sending',
        error: null,
        copied: false,
      };

    case 'STREAM_CHUNK':
      return {
        ...state,
        completion: state.completion + action.payload,
        streamPhase: 'writing',
      };

    case 'STREAM_DONE':
      return {
        ...state,
        isLoading: false,
        streamPhase: 'done',
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
        streamPhase: 'idle',
      };

    case 'RESET':
      return initialState;

    case 'SET_CATEGORY':
      return { ...state, selectedCategory: action.payload };

    case 'SET_TONE':
      return { ...state, selectedTone: action.payload };

    case 'SET_CAPABILITY':
      return { ...state, selectedCapability: action.payload };

    case 'SET_QUESTIONS':
      return {
        ...state,
        questions: action.payload,
      };

    case 'SET_DETECTED_CATEGORY':
      return {
        ...state,
        detectedCategory: action.payload,
      };

    case 'SET_QUESTION_ANSWER':
      return {
        ...state,
        questionAnswers: {
          ...state.questionAnswers,
          [action.payload.id]: action.payload.answer,
        },
      };

    case 'SET_COMPLETION':
      return { ...state, completion: action.payload };

    case 'SET_VARIABLE_VALUES':
      return { ...state, variableValues: action.payload };

    case 'SET_COPIED':
      return { ...state, copied: action.payload };

    case 'INCREMENT_ITERATION':
      return { ...state, iterationCount: state.iterationCount + 1 };

    case 'CLEAR_ANSWERS':
      return { ...state, questionAnswers: {} };

    default:
      return state;
  }
}

// --- Hook ---

export function usePromptWorkflow() {
  const [state, dispatch] = useReducer(promptReducer, initialState);
  return { state, dispatch };
}

// --- Client-Side Response Cache ---

const MAX_CACHE_SIZE = 20;

class LRUCache {
  private cache = new Map<string, string>();

  get(key: string): string | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: string): void {
    this.cache.delete(key);
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const promptCache = new LRUCache();

export function getCacheKey(capability: string, input: string): string {
  return `${capability}:${input.trim().toLowerCase()}`;
}
