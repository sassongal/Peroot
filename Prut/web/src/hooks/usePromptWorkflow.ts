'use client';

import { useReducer } from 'react';
import type { Question } from '@/lib/types';
import { CapabilityMode } from '@/lib/capability-mode';
import { logger } from '@/lib/logger';

// --- Types ---

export type StreamPhase = 'idle' | 'sending' | 'writing' | 'done' | 'interrupted';

/** Context captured at generation time - used for refinement to avoid platform drift */
export interface GenerationContext {
  mode: CapabilityMode;
  modeParams?: Record<string, string>;
  category: string;
  tone: string;
}

export interface PromptState {
  input: string;
  originalInput: string;
  completion: string;
  isLoading: boolean;
  streamPhase: StreamPhase;
  error: string | null;
  selectedCategory: string;
  selectedTone: string;
  selectedCapability: CapabilityMode;
  questions: Question[];
  detectedCategory: string;
  questionAnswers: Record<string, string>;
  variableValues: Record<string, string>;
  /** Variable keys that were pre-filled from saved user memory */
  preFilledKeys: string[];
  copied: boolean;
  iterationCount: number;
  /** Snapshot of generation params - used in refinement to prevent platform drift (BUG #2) */
  generationContext: GenerationContext | null;
  /** Score of the previous completion - used to show score delta */
  previousScore: number | null;
}

export type PromptAction =
  | { type: 'SET_INPUT'; payload: string }
  | { type: 'START_STREAM' }
  | { type: 'STREAM_CHUNK'; payload: string }
  | { type: 'STREAM_DONE' }
  | { type: 'STREAM_INTERRUPTED' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESET' }
  | { type: 'RESET_TO_ORIGINAL' }
  | { type: 'SET_CATEGORY'; payload: string }
  | { type: 'SET_TONE'; payload: string }
  | { type: 'SET_CAPABILITY'; payload: CapabilityMode }
  | { type: 'SET_QUESTIONS'; payload: Question[] }
  | { type: 'SET_DETECTED_CATEGORY'; payload: string }
  | { type: 'SET_QUESTION_ANSWER'; payload: { id: number; answer: string } }
  | { type: 'SET_VARIABLE_VALUES'; payload: Record<string, string> }
  | { type: 'SET_PREFILLED_KEYS'; payload: string[] }
  | { type: 'SET_COMPLETION'; payload: string }
  | { type: 'SET_COPIED'; payload: boolean }
  | { type: 'INCREMENT_ITERATION' }
  | { type: 'CLEAR_ANSWERS' }
  | { type: 'SET_GENERATION_CONTEXT'; payload: GenerationContext }
  | { type: 'SET_PREVIOUS_SCORE'; payload: number };

// --- Initial State ---

const initialState: PromptState = {
  input: '',
  originalInput: '',
  completion: '',
  isLoading: false,
  streamPhase: 'idle',
  error: null,
  selectedCategory: 'General',
  selectedTone: 'Professional',
  selectedCapability: (typeof window !== 'undefined' ? localStorage.getItem('peroot_last_mode') as CapabilityMode : null) || CapabilityMode.STANDARD,
  questions: [],
  detectedCategory: '',
  questionAnswers: {},
  variableValues: {},
  preFilledKeys: [],
  copied: false,
  iterationCount: 0,
  generationContext: null,
  previousScore: null,
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
        // Snapshot the current input as originalInput only on the very first enhance.
        // Subsequent refinements (iterationCount > 0) preserve the original.
        originalInput: state.originalInput || state.input,
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

    case 'STREAM_INTERRUPTED':
      return {
        ...state,
        isLoading: false,
        streamPhase: 'interrupted',
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

    case 'RESET_TO_ORIGINAL':
      return {
        ...state,
        input: state.originalInput,
        originalInput: '',
        completion: '',
        streamPhase: 'idle',
        error: null,
        questions: [],
        questionAnswers: {},
        iterationCount: 0,
        copied: false,
        generationContext: null,
        previousScore: null,
      };

    case 'SET_CATEGORY':
      return { ...state, selectedCategory: action.payload };

    case 'SET_TONE':
      return { ...state, selectedTone: action.payload };

    case 'SET_CAPABILITY':
      if (typeof window !== 'undefined') {
        // localStorage can fail on Safari private mode or quota exhaustion.
        // Don't silently swallow — surface the warning so we can see it in
        // logs/Sentry if preferences stop persisting for a user cohort.
        try { localStorage.setItem('peroot_last_mode', action.payload); }
        catch (e) { logger.warn('[usePromptWorkflow] localStorage write failed:', e); }
      }
      return { ...state, selectedCapability: action.payload };

    case 'SET_QUESTIONS':
      // BUG #3 fix + Upgrade 4: Clear old answers when new questions arrive
      // Old answer keys from previous round don't match new question IDs
      return {
        ...state,
        questions: action.payload,
        questionAnswers: {},
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
          [String(action.payload.id)]: action.payload.answer,
        },
      };

    case 'SET_COMPLETION':
      return {
        ...state,
        completion: action.payload,
        // Update streamPhase to 'writing' during active streaming
        ...(state.isLoading && action.payload ? { streamPhase: 'writing' as const } : {}),
      };

    case 'SET_VARIABLE_VALUES':
      return { ...state, variableValues: action.payload };

    case 'SET_PREFILLED_KEYS':
      return { ...state, preFilledKeys: action.payload };

    case 'SET_COPIED':
      return { ...state, copied: action.payload };

    case 'INCREMENT_ITERATION':
      return { ...state, iterationCount: state.iterationCount + 1 };

    case 'CLEAR_ANSWERS':
      return { ...state, questionAnswers: {} };

    case 'SET_GENERATION_CONTEXT':
      return { ...state, generationContext: action.payload };

    case 'SET_PREVIOUS_SCORE':
      return { ...state, previousScore: action.payload };

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
