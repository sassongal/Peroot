# Peroot AI — Full Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Decompose the monolithic page.tsx, optimize AI gateway routing & caching, improve performance, polish UX, and add Pro tier monetization — all within $50/month budget on free-tier infrastructure.

**Architecture:** Extract 15+ useState calls into a useReducer hook, unify duplicate streaming logic, add task-based AI model routing with Redis caching, replace middleware DB queries with Redis, lazy-load below-fold components, fix i18n gaps, and integrate Stripe for Pro subscriptions.

**Tech Stack:** Next.js 16 (App Router, basePath `/peroot`), React 19, TypeScript 5, Supabase (auth + DB), Upstash Redis, Vercel AI SDK 6, Vitest 4, Stripe

---

## Section 1: Architecture — Component Decomposition

### Task 1: Create `usePromptWorkflow` Reducer

**Files:**
- Create: `src/hooks/usePromptWorkflow.ts`
- Create: `src/hooks/__tests__/usePromptWorkflow.test.ts`

**Step 1: Write the failing test**

```typescript
// src/hooks/__tests__/usePromptWorkflow.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePromptWorkflow, PromptAction } from '../usePromptWorkflow';

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
    act(() => result.current.dispatch({ type: 'SET_CAPABILITY', payload: 'RESEARCH' }));
    expect(result.current.state.selectedCapability).toBe('RESEARCH');
  });

  it('handles SET_QUESTIONS action with detected category', () => {
    const { result } = renderHook(() => usePromptWorkflow());
    const questions = [{ id: 1, text: 'What tone?' }];
    act(() => result.current.dispatch({ type: 'SET_QUESTIONS', payload: { questions, detectedCategory: 'Tech' } }));
    expect(result.current.state.questions).toEqual(questions);
    expect(result.current.state.detectedCategory).toBe('Tech');
  });
});
```

**Step 2: Install test dependencies and run test to verify it fails**

Run: `npm install --save-dev @testing-library/react @testing-library/jest-dom`
Run: `npx vitest run src/hooks/__tests__/usePromptWorkflow.test.ts`
Expected: FAIL — module `../usePromptWorkflow` not found

**Step 3: Write minimal implementation**

```typescript
// src/hooks/usePromptWorkflow.ts
import { useReducer } from 'react';

export type StreamPhase = 'idle' | 'sending' | 'processing' | 'writing' | 'done';

export interface Question {
  id: number;
  text: string;
}

export interface PromptState {
  input: string;
  completion: string;
  isLoading: boolean;
  streamPhase: StreamPhase;
  error: string | null;
  selectedCategory: string;
  selectedTone: string;
  selectedCapability: string;
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
  | { type: 'SET_CAPABILITY'; payload: string }
  | { type: 'SET_QUESTIONS'; payload: { questions: Question[]; detectedCategory: string } }
  | { type: 'SET_QUESTION_ANSWER'; payload: { id: number; answer: string } }
  | { type: 'SET_VARIABLE_VALUES'; payload: Record<string, string> }
  | { type: 'SET_COPIED'; payload: boolean }
  | { type: 'INCREMENT_ITERATION' };

const initialState: PromptState = {
  input: '',
  completion: '',
  isLoading: false,
  streamPhase: 'idle',
  error: null,
  selectedCategory: 'General',
  selectedTone: 'Professional',
  selectedCapability: 'STANDARD',
  questions: [],
  detectedCategory: '',
  questionAnswers: {},
  variableValues: {},
  copied: false,
  iterationCount: 0,
};

function promptReducer(state: PromptState, action: PromptAction): PromptState {
  switch (action.type) {
    case 'SET_INPUT':
      return { ...state, input: action.payload };
    case 'START_STREAM':
      return { ...state, isLoading: true, completion: '', error: null, streamPhase: 'sending', copied: false };
    case 'STREAM_CHUNK':
      return { ...state, completion: state.completion + action.payload, streamPhase: 'writing' };
    case 'STREAM_DONE':
      return { ...state, isLoading: false, streamPhase: 'done' };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false, streamPhase: 'idle' };
    case 'RESET':
      return { ...initialState };
    case 'SET_CATEGORY':
      return { ...state, selectedCategory: action.payload };
    case 'SET_TONE':
      return { ...state, selectedTone: action.payload };
    case 'SET_CAPABILITY':
      return { ...state, selectedCapability: action.payload };
    case 'SET_QUESTIONS':
      return { ...state, questions: action.payload.questions, detectedCategory: action.payload.detectedCategory };
    case 'SET_QUESTION_ANSWER':
      return { ...state, questionAnswers: { ...state.questionAnswers, [action.payload.id]: action.payload.answer } };
    case 'SET_VARIABLE_VALUES':
      return { ...state, variableValues: action.payload };
    case 'SET_COPIED':
      return { ...state, copied: action.payload };
    case 'INCREMENT_ITERATION':
      return { ...state, iterationCount: state.iterationCount + 1 };
    default:
      return state;
  }
}

export function usePromptWorkflow() {
  const [state, dispatch] = useReducer(promptReducer, initialState);
  return { state, dispatch };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/__tests__/usePromptWorkflow.test.ts`
Expected: ALL PASS (9 tests)

**Step 5: Commit**

```bash
git add src/hooks/usePromptWorkflow.ts src/hooks/__tests__/usePromptWorkflow.test.ts
git commit -m "feat: add usePromptWorkflow reducer hook

Extracts 15+ useState calls from page.tsx into a single useReducer.
Handles: input, streaming state, categories, questions, variables."
```

---

### Task 2: Create `useStreamingCompletion` Hook

**Files:**
- Create: `src/hooks/useStreamingCompletion.ts`
- Create: `src/hooks/__tests__/useStreamingCompletion.test.ts`

**Step 1: Write the failing test**

```typescript
// src/hooks/__tests__/useStreamingCompletion.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStreamingCompletion } from '../useStreamingCompletion';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useStreamingCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns correct interface', () => {
    const onChunk = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useStreamingCompletion({ onChunk, onDone, onError })
    );
    expect(result.current.startStream).toBeInstanceOf(Function);
    expect(result.current.abort).toBeInstanceOf(Function);
    expect(result.current.isStreaming).toBe(false);
  });

  it('sets isStreaming to true when stream starts', async () => {
    // Create a stream that never resolves
    const stream = new ReadableStream({
      start() { /* never push, never close */ },
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: stream,
    });

    const onChunk = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useStreamingCompletion({ onChunk, onDone, onError })
    );

    // Don't await — we just want to check isStreaming flips
    act(() => {
      result.current.startStream('/api/enhance', { prompt: 'test' });
    });

    // Give microtask a tick
    await act(async () => {
      await new Promise(r => setTimeout(r, 10));
    });

    expect(result.current.isStreaming).toBe(true);
  });

  it('calls onError for non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Rate limited' }),
    });

    const onChunk = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useStreamingCompletion({ onChunk, onDone, onError })
    );

    await act(async () => {
      await result.current.startStream('/api/enhance', { prompt: 'test' });
    });

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Rate limited'),
    }));
    expect(result.current.isStreaming).toBe(false);
  });

  it('processes stream chunks and calls onChunk', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('Hello '));
        controller.enqueue(encoder.encode('World'));
        controller.close();
      },
    });
    mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

    const onChunk = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useStreamingCompletion({ onChunk, onDone, onError })
    );

    await act(async () => {
      await result.current.startStream('/api/enhance', { prompt: 'test' });
    });

    expect(onChunk).toHaveBeenCalledWith('Hello ');
    expect(onChunk).toHaveBeenCalledWith('World');
    expect(onDone).toHaveBeenCalledWith('Hello World');
    expect(result.current.isStreaming).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/__tests__/useStreamingCompletion.test.ts`
Expected: FAIL — module `../useStreamingCompletion` not found

**Step 3: Write minimal implementation**

```typescript
// src/hooks/useStreamingCompletion.ts
import { useCallback, useRef, useState } from 'react';

interface StreamingOptions {
  onChunk: (chunk: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

export function useStreamingCompletion({ onChunk, onDone, onError }: StreamingOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(async (url: string, body: Record<string, unknown>) => {
    abort(); // Cancel any existing stream

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsStreaming(true);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        onChunk(chunk);
      }

      onDone(accumulated);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        // User cancelled — don't report as error
        return;
      }
      onError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [abort, onChunk, onDone, onError]);

  return { startStream, abort, isStreaming };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/__tests__/useStreamingCompletion.test.ts`
Expected: ALL PASS (4 tests)

**Step 5: Commit**

```bash
git add src/hooks/useStreamingCompletion.ts src/hooks/__tests__/useStreamingCompletion.test.ts
git commit -m "feat: add useStreamingCompletion hook

Unifies duplicate streaming logic from handleEnhance and handleRefine.
Manages AbortController, chunk accumulation, error handling."
```

---

### Task 3: Create `useAuth` Hook

**Files:**
- Create: `src/hooks/useAuth.ts`
- Create: `src/hooks/__tests__/useAuth.test.ts`

**Step 1: Write the failing test**

```typescript
// src/hooks/__tests__/useAuth.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  }),
}));

describe('useAuth', () => {
  it('returns null user when not authenticated', async () => {
    const { result } = renderHook(() => useAuth());
    // Wait for async getUser
    await act(async () => {
      await new Promise(r => setTimeout(r, 10));
    });
    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('provides signOut function', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.signOut).toBeInstanceOf(Function);
  });

  it('provides planTier defaulting to guest', async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await new Promise(r => setTimeout(r, 10));
    });
    expect(result.current.planTier).toBe('guest');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/__tests__/useAuth.test.ts`
Expected: FAIL — module `../useAuth` not found

**Step 3: Write minimal implementation**

```typescript
// src/hooks/useAuth.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export type PlanTier = 'guest' | 'free' | 'pro';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  planTier: PlanTier;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    planTier: 'guest',
  });

  useEffect(() => {
    const supabase = createClient();

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        // Fetch plan tier from profile
        supabase
          .from('profiles')
          .select('plan_tier')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            setState({
              user,
              isLoading: false,
              planTier: (data?.plan_tier as PlanTier) || 'free',
            });
          });
      } else {
        setState({ user: null, isLoading: false, planTier: 'guest' });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user ?? null;
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('plan_tier')
            .eq('id', user.id)
            .single();
          setState({
            user,
            isLoading: false,
            planTier: (data?.plan_tier as PlanTier) || 'free',
          });
        } else {
          setState({ user: null, isLoading: false, planTier: 'guest' });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  }, []);

  return { ...state, signOut };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/__tests__/useAuth.test.ts`
Expected: ALL PASS (3 tests)

**Step 5: Commit**

```bash
git add src/hooks/useAuth.ts src/hooks/__tests__/useAuth.test.ts
git commit -m "feat: add useAuth hook

Extracts Supabase auth state management from page.tsx.
Provides user, planTier, isLoading, and signOut."
```

---

### Task 4: Add Lazy Loading for Below-Fold Components

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add dynamic imports at top of page.tsx**

Replace the static imports for these 6 components with `next/dynamic`:

```typescript
// At top of page.tsx, replace:
// import PromptHistory from '@/components/features/prompt-improver/PromptHistory';
// import PersonalLibraryView from '@/components/features/prompt-improver/PersonalLibraryView';
// import AchievementsPanel from '@/components/features/prompt-improver/AchievementsPanel';
// import SmartRefinement from '@/components/features/prompt-improver/SmartRefinement';
// import VariableManager from '@/components/features/prompt-improver/VariableManager';
// import ResultSection from '@/components/features/prompt-improver/ResultSection';

// With:
import dynamic from 'next/dynamic';

const PromptHistory = dynamic(
  () => import('@/components/features/prompt-improver/PromptHistory'),
  { ssr: false }
);
const PersonalLibraryView = dynamic(
  () => import('@/components/features/prompt-improver/PersonalLibraryView'),
  { ssr: false }
);
const AchievementsPanel = dynamic(
  () => import('@/components/features/prompt-improver/AchievementsPanel'),
  { ssr: false }
);
const SmartRefinement = dynamic(
  () => import('@/components/features/prompt-improver/SmartRefinement'),
  { ssr: false }
);
const VariableManager = dynamic(
  () => import('@/components/features/prompt-improver/VariableManager'),
  { ssr: false }
);
const ResultSection = dynamic(
  () => import('@/components/features/prompt-improver/ResultSection'),
  { ssr: false }
);
```

**Step 2: Verify each component has a default export**

Check each of the 6 component files. If any uses named export only, wrap with default:
Run: `grep -n "export default" src/components/features/prompt-improver/{PromptHistory,PersonalLibraryView,AchievementsPanel,SmartRefinement,VariableManager,ResultSection}.tsx`

Fix any that don't have default exports.

**Step 3: Build to verify no errors**

Run: `npm run build 2>&1 | head -50`
Expected: Build succeeds with no import errors

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "perf: lazy-load 6 below-fold components

Uses next/dynamic with ssr: false for PromptHistory,
PersonalLibraryView, AchievementsPanel, SmartRefinement,
VariableManager, and ResultSection."
```

---

### Task 5: Refactor page.tsx to Use New Hooks

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Replace useState calls with usePromptWorkflow**

In `page.tsx`, replace the 15+ useState calls (lines ~62-85) with:

```typescript
import { usePromptWorkflow } from '@/hooks/usePromptWorkflow';

// Inside component:
const { state: promptState, dispatch } = usePromptWorkflow();

// Then replace all direct state references:
// inputVal → promptState.input
// completion → promptState.completion
// isLoading → promptState.isLoading
// selectedCategory → promptState.selectedCategory
// selectedTone → promptState.selectedTone
// etc.

// Replace all setState calls:
// setInputVal(x) → dispatch({ type: 'SET_INPUT', payload: x })
// setIsLoading(true) → dispatch({ type: 'START_STREAM' })
// setCompletion(x) → handled by streaming hook
// etc.
```

**Step 2: Replace duplicate streaming logic with useStreamingCompletion**

Replace `handleEnhance` and `handleRefine` implementations to use the new hook:

```typescript
import { useStreamingCompletion } from '@/hooks/useStreamingCompletion';

const { startStream, abort, isStreaming } = useStreamingCompletion({
  onChunk: (chunk) => dispatch({ type: 'STREAM_CHUNK', payload: chunk }),
  onDone: (fullText) => dispatch({ type: 'STREAM_DONE' }),
  onError: (error) => dispatch({ type: 'SET_ERROR', payload: error.message }),
});

const handleEnhance = async () => {
  dispatch({ type: 'START_STREAM' });
  await startStream('/api/enhance', {
    prompt: promptState.input,
    category: promptState.selectedCategory,
    tone: promptState.selectedTone,
    capability: promptState.selectedCapability,
  });
};

const handleRefine = async (instruction: string) => {
  dispatch({ type: 'START_STREAM' });
  await startStream('/api/refine', {
    prompt: promptState.input,
    previousResult: promptState.completion,
    refinementInstruction: instruction,
    questions: promptState.questions,
    answers: promptState.questionAnswers,
  });
};
```

**Step 3: Integrate useAuth hook**

```typescript
import { useAuth } from '@/hooks/useAuth';

const { user, planTier, isLoading: authLoading, signOut } = useAuth();
```

Remove the scattered `supabase.auth` calls and session state management.

**Step 4: Verify dev server works**

Run: `npm run dev`
Manually test: navigate to localhost, try enhance and refine flows.
Expected: Same behavior as before refactor.

**Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "refactor: integrate usePromptWorkflow, useStreamingCompletion, useAuth

Reduces page.tsx from ~685 to ~300 lines.
Eliminates duplicate streaming logic.
Single source of truth for prompt state via useReducer."
```

---

## Section 2: AI Gateway & Model Routing

### Task 6: Add Task-Based Model Routing

**Files:**
- Modify: `src/lib/ai/models.ts`
- Modify: `src/lib/ai/gateway.ts`
- Create: `src/lib/ai/__tests__/gateway.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/ai/__tests__/gateway.test.ts
import { describe, it, expect } from 'vitest';
import { TASK_ROUTING, getModelsForTask } from '../models';

describe('Task-Based Model Routing', () => {
  it('returns models for enhance task', () => {
    const models = getModelsForTask('enhance');
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]).toBe('gemini-2.0-flash');
  });

  it('returns models for research task', () => {
    const models = getModelsForTask('research');
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]).toBe('deepseek-chat');
  });

  it('falls back to enhance routing for unknown task', () => {
    const models = getModelsForTask('unknown-task');
    expect(models).toEqual(TASK_ROUTING.enhance);
  });

  it('has routing for all expected tasks', () => {
    expect(TASK_ROUTING).toHaveProperty('enhance');
    expect(TASK_ROUTING).toHaveProperty('research');
    expect(TASK_ROUTING).toHaveProperty('agent');
    expect(TASK_ROUTING).toHaveProperty('image');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/ai/__tests__/gateway.test.ts`
Expected: FAIL — `TASK_ROUTING` and `getModelsForTask` not found

**Step 3: Implement task routing in models.ts**

Add to `src/lib/ai/models.ts`:

```typescript
export type TaskType = 'enhance' | 'research' | 'agent' | 'image';

export const TASK_ROUTING: Record<string, ModelId[]> = {
  enhance:  ['gemini-2.0-flash', 'deepseek-chat', 'llama-3-70b'],
  research: ['deepseek-chat', 'gemini-2.0-flash'],
  agent:    ['gemini-2.0-flash', 'llama-3-70b'],
  image:    ['gemini-2.0-flash', 'gemini-1.5-flash'],
};

export function getModelsForTask(task: string): ModelId[] {
  return TASK_ROUTING[task] ?? TASK_ROUTING.enhance;
}
```

**Step 4: Update gateway.ts to accept task parameter**

Modify `AIGateway.generateStream` in `src/lib/ai/gateway.ts`:

```typescript
import { getModelsForTask } from './models';
// Change signature:
static async generateStream(params: GatewayParams & { task?: string }): Promise<...> {
    const models = params.task ? getModelsForTask(params.task) : FALLBACK_ORDER;
    for (const modelId of models) {
        // ... existing try/catch fallback logic
    }
}
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/ai/__tests__/gateway.test.ts`
Expected: ALL PASS (4 tests)

**Step 6: Commit**

```bash
git add src/lib/ai/models.ts src/lib/ai/gateway.ts src/lib/ai/__tests__/gateway.test.ts
git commit -m "feat: add task-based model routing to AI Gateway

Routes enhance/research/agent/image tasks to optimal model order.
Falls back to enhance routing for unknown tasks."
```

---

### Task 7: Migrate Rate Limiter to @upstash/ratelimit

**Files:**
- Rewrite: `src/lib/ratelimit.ts`
- Create: `src/lib/__tests__/ratelimit.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/__tests__/ratelimit.test.ts
import { describe, it, expect, vi } from 'vitest';

// Mock @upstash/ratelimit
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class MockRatelimit {
    constructor() {}
    limit = vi.fn().mockResolvedValue({ success: true, limit: 30, remaining: 29, reset: Date.now() + 3600000 });
  },
}));

vi.mock('@upstash/redis', () => ({
  Redis: class MockRedis {
    constructor() {}
  },
}));

describe('Rate Limiter', () => {
  it('exports rateLimiters for guest, free, and pro tiers', async () => {
    const { rateLimiters } = await import('../ratelimit');
    expect(rateLimiters).toHaveProperty('guest');
    expect(rateLimiters).toHaveProperty('free');
    expect(rateLimiters).toHaveProperty('pro');
  });

  it('exports checkRateLimit function', async () => {
    const { checkRateLimit } = await import('../ratelimit');
    expect(checkRateLimit).toBeInstanceOf(Function);
  });

  it('checkRateLimit returns success result', async () => {
    const { checkRateLimit } = await import('../ratelimit');
    const result = await checkRateLimit('test-user', 'free');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('remaining');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/ratelimit.test.ts`
Expected: FAIL — current ratelimit.ts doesn't export `rateLimiters`

**Step 3: Rewrite ratelimit.ts**

Replace the entire contents of `src/lib/ratelimit.ts`:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const rateLimiters = {
  guest: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: '@peroot/ratelimit:guest',
  }),
  free: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 h'),
    prefix: '@peroot/ratelimit:free',
  }),
  pro: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(200, '1 h'),
    prefix: '@peroot/ratelimit:pro',
  }),
};

export type RateLimitTier = 'guest' | 'free' | 'pro';

export async function checkRateLimit(identifier: string, tier: RateLimitTier = 'guest') {
  const limiter = rateLimiters[tier];
  const result = await limiter.limit(identifier);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}
```

**Step 4: Update all callers of checkRateLimit**

Search for usages:
Run: `grep -rn "checkRateLimit\|from.*ratelimit" src/app/api/ --include="*.ts"`

Update any API routes that call `checkRateLimit` to use the new signature (same function name, same parameters — should be backwards compatible).

**Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/ratelimit.test.ts`
Expected: ALL PASS (3 tests)

**Step 6: Commit**

```bash
git add src/lib/ratelimit.ts src/lib/__tests__/ratelimit.test.ts
git commit -m "refactor: replace manual rate limiter with @upstash/ratelimit

Replaces 95-line fixed-window implementation with sliding window.
Uses @upstash/ratelimit (was installed but unused).
Tiers: guest 5/hr, free 30/hr, pro 200/hr."
```

---

### Task 8: Optimize Middleware — Remove DB Query

**Files:**
- Modify: `src/middleware.ts`
- Create: `src/lib/maintenance.ts`

**Step 1: Create maintenance mode cache helper**

```typescript
// src/lib/maintenance.ts
import { Redis } from '@upstash/redis';

const CACHE_KEY = '@peroot/maintenance_mode';
const CACHE_TTL = 60; // seconds

let redis: Redis | null = null;

function getRedis() {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

export async function isMaintenanceMode(): Promise<boolean> {
  try {
    const cached = await getRedis().get<boolean>(CACHE_KEY);
    return cached ?? false;
  } catch {
    // If Redis fails, assume not in maintenance (safe default)
    return false;
  }
}

export async function setMaintenanceMode(enabled: boolean): Promise<void> {
  await getRedis().set(CACHE_KEY, enabled, { ex: CACHE_TTL });
}
```

**Step 2: Update middleware to use Redis instead of DB query**

Replace the DB query in `src/middleware.ts` (lines 35-38):

```typescript
// REMOVE:
// const { data: settings } = await supabase
//   .from('site_settings')
//   .select('maintenance_mode')
//   .single();
// const isMaintenance = settings?.maintenance_mode;

// REPLACE WITH:
import { isMaintenanceMode } from '@/lib/maintenance';
const isMaintenance = await isMaintenanceMode();
```

**Step 3: Update admin maintenance toggle to write to Redis**

Find the admin API route that toggles maintenance mode and add:

```typescript
import { setMaintenanceMode } from '@/lib/maintenance';

// After updating site_settings in Supabase:
await setMaintenanceMode(enabled);
```

**Step 4: Test middleware performance**

Run: `npm run dev`
Test: Load any page and check response time in DevTools Network tab.
Expected: Response headers show faster TTFB (no DB query per request).

**Step 5: Commit**

```bash
git add src/middleware.ts src/lib/maintenance.ts
git commit -m "perf: replace middleware DB query with Redis cache

Removes Supabase query from middleware (ran on EVERY request).
Maintenance mode now cached in Redis with 60-second TTL.
Sub-1ms reads vs ~50-100ms DB queries."
```

---

## Section 3: Performance & Caching

### Task 9: Dead Dependency Audit & Cleanup

**Files:**
- Modify: `package.json`
- Modify: `next.config.ts`

**Step 1: Check Remotion usage**

Run: `grep -rn "remotion\|@remotion" src/ --include="*.ts" --include="*.tsx" | head -20`

If no results (or only in unused files), remove Remotion:

Run: `npm uninstall remotion @remotion/cli @remotion/player`

**Step 2: Check react-markdown usage**

Run: `grep -rn "react-markdown\|ReactMarkdown" src/ --include="*.ts" --include="*.tsx"`

If used, keep it. If not, remove: `npm uninstall react-markdown`

**Step 3: Fix dead `recharts` reference in next.config.ts**

`recharts` is in `optimizePackageImports` but NOT in `package.json`. Remove it from the config:

```typescript
// In next.config.ts, change:
optimizePackageImports: ['lucide-react', 'date-fns', 'recharts', '@radix-ui/react-slot'],
// To:
optimizePackageImports: ['lucide-react', 'date-fns', '@radix-ui/react-slot', 'posthog-js', '@sentry/nextjs'],
```

**Step 4: Build to verify**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds, potentially smaller bundle

**Step 5: Commit**

```bash
git add package.json package-lock.json next.config.ts
git commit -m "chore: remove dead dependencies and fix optimizePackageImports

Remove Remotion (if unused), fix recharts ghost reference.
Add posthog-js and @sentry/nextjs to optimizePackageImports."
```

---

### Task 10: Add Client-Side Response Cache

**Files:**
- Modify: `src/hooks/usePromptWorkflow.ts`
- Modify: `src/hooks/__tests__/usePromptWorkflow.test.ts`

**Step 1: Write the failing test**

Add to `src/hooks/__tests__/usePromptWorkflow.test.ts`:

```typescript
import { promptCache } from '../usePromptWorkflow';

describe('promptCache', () => {
  it('stores and retrieves cached responses', () => {
    promptCache.set('test-key', 'cached result');
    expect(promptCache.get('test-key')).toBe('cached result');
  });

  it('returns undefined for missing keys', () => {
    expect(promptCache.get('nonexistent')).toBeUndefined();
  });

  it('evicts oldest entry when max size reached', () => {
    // Fill cache to max (20)
    for (let i = 0; i < 21; i++) {
      promptCache.set(`key-${i}`, `value-${i}`);
    }
    // First entry should be evicted
    expect(promptCache.get('key-0')).toBeUndefined();
    expect(promptCache.get('key-20')).toBe('value-20');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/__tests__/usePromptWorkflow.test.ts`
Expected: FAIL — `promptCache` not exported

**Step 3: Add LRU cache to usePromptWorkflow.ts**

Add at the bottom of `src/hooks/usePromptWorkflow.ts`:

```typescript
const MAX_CACHE_SIZE = 20;

class LRUCache {
  private cache = new Map<string, string>();

  get(key: string): string | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: string): void {
    this.cache.delete(key); // Remove if exists
    if (this.cache.size >= MAX_CACHE_SIZE) {
      // Evict oldest (first entry)
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
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/__tests__/usePromptWorkflow.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/hooks/usePromptWorkflow.ts src/hooks/__tests__/usePromptWorkflow.test.ts
git commit -m "feat: add LRU client-side response cache

20-entry LRU cache for instant replay of repeated prompts.
Key: capability + normalized input. Avoids redundant API calls."
```

---

## Section 4: UX Improvements

### Task 11: Fix i18n in SmartRefinement

**Files:**
- Modify: `src/components/features/prompt-improver/SmartRefinement.tsx`
- Modify: `src/i18n/dictionaries/he.json`
- Modify: `src/i18n/dictionaries/en.json`

**Step 1: Add i18n keys to dictionaries**

In `src/i18n/dictionaries/he.json`, add under the appropriate section:

```json
"smart_refinement": {
  "categories": "קטגוריות שיפור",
  "select_focus": "בחר תחום התמקדות",
  "refine_button": "שפר עם התמקדות",
  "tone": "טון",
  "length": "אורך",
  "creativity": "יצירתיות",
  "technical": "טכני",
  "context": "הקשר"
}
```

In `src/i18n/dictionaries/en.json`, add:

```json
"smart_refinement": {
  "categories": "Improvement Categories",
  "select_focus": "Select focus area",
  "refine_button": "Refine with focus",
  "tone": "Tone",
  "length": "Length",
  "creativity": "Creativity",
  "technical": "Technical",
  "context": "Context"
}
```

**Step 2: Update SmartRefinement.tsx to use i18n**

Add `useI18n` import and replace all hardcoded Hebrew strings:

```typescript
import { useI18n } from '@/lib/i18n/context';

// Inside component:
const { t } = useI18n();

// Replace hardcoded strings:
// "קטגוריות שיפור" → t('smart_refinement.categories')
// "בחר תחום התמקדות" → t('smart_refinement.select_focus')
// "שפר עם התמקדות" → t('smart_refinement.refine_button')
// etc.
```

**Step 3: Test manually**

Run: `npm run dev`
Navigate to the refinement section and verify Hebrew text still appears.
Switch to English (if available) and verify English text appears.

**Step 4: Commit**

```bash
git add src/components/features/prompt-improver/SmartRefinement.tsx src/i18n/dictionaries/he.json src/i18n/dictionaries/en.json
git commit -m "fix: replace hardcoded Hebrew in SmartRefinement with i18n

Adds smart_refinement keys to he.json and en.json.
All 10 hardcoded strings now use useI18n() translations."
```

---

### Task 12: Add Streaming Progress Indicator

**Files:**
- Modify: `src/hooks/usePromptWorkflow.ts` (already has `streamPhase`)
- Create: `src/components/ui/StreamingProgress.tsx`

**Step 1: Create StreamingProgress component**

```typescript
// src/components/ui/StreamingProgress.tsx
'use client';

import { useI18n } from '@/lib/i18n/context';
import type { StreamPhase } from '@/hooks/usePromptWorkflow';

const PHASE_ICONS: Record<StreamPhase, string> = {
  idle: '',
  sending: '📡',
  processing: '⚙️',
  writing: '✍️',
  done: '✅',
};

interface StreamingProgressProps {
  phase: StreamPhase;
}

export default function StreamingProgress({ phase }: StreamingProgressProps) {
  const { t } = useI18n();

  if (phase === 'idle' || phase === 'done') return null;

  const labels: Record<string, string> = {
    sending: t('streaming.sending') || 'שולח',
    processing: t('streaming.processing') || 'מעבד',
    writing: t('streaming.writing') || 'כותב',
  };

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
      <span>{PHASE_ICONS[phase]}</span>
      <span>{labels[phase]}</span>
      <span className="inline-flex gap-0.5">
        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
      </span>
    </div>
  );
}
```

**Step 2: Add i18n keys for streaming phases**

In `he.json`:
```json
"streaming": {
  "sending": "שולח",
  "processing": "מעבד",
  "writing": "כותב",
  "done": "הושלם"
}
```

In `en.json`:
```json
"streaming": {
  "sending": "Sending",
  "processing": "Processing",
  "writing": "Writing",
  "done": "Complete"
}
```

**Step 3: Integrate in page.tsx**

Replace the existing loading spinner with:

```typescript
import StreamingProgress from '@/components/ui/StreamingProgress';

// In JSX, where spinner currently shows:
{promptState.isLoading && <StreamingProgress phase={promptState.streamPhase} />}
```

**Step 4: Commit**

```bash
git add src/components/ui/StreamingProgress.tsx src/app/page.tsx src/i18n/dictionaries/he.json src/i18n/dictionaries/en.json
git commit -m "feat: add multi-phase streaming progress indicator

Shows sending → processing → writing phases with animated dots.
Replaces simple spinner. Uses i18n for Hebrew/English labels."
```

---

### Task 13: Add One-Click Iteration Loop

**Files:**
- Modify: `src/components/features/prompt-improver/ResultSection.tsx`
- Modify: `src/i18n/dictionaries/he.json`
- Modify: `src/i18n/dictionaries/en.json`

**Step 1: Add "Improve Again" button to ResultSection**

In `src/components/features/prompt-improver/ResultSection.tsx`, add prop and button:

```typescript
interface ResultSectionProps {
  // ... existing props
  onImproveAgain?: () => void;
  iterationCount?: number;
}

// In the JSX, next to existing copy/save buttons:
{onImproveAgain && (
  <button
    onClick={onImproveAgain}
    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors min-h-11 min-w-11"
  >
    <RefreshCw className="w-4 h-4" />
    {t('result.improve_again')}
    {(iterationCount ?? 0) > 0 && (
      <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full">
        #{iterationCount}
      </span>
    )}
  </button>
)}
```

**Step 2: Add i18n keys**

In `he.json`:
```json
"result": {
  "improve_again": "שפר שוב"
}
```

In `en.json`:
```json
"result": {
  "improve_again": "Improve Again"
}
```

**Step 3: Wire up in page.tsx**

```typescript
// In page.tsx where ResultSection is rendered:
<ResultSection
  // ... existing props
  onImproveAgain={() => {
    dispatch({ type: 'SET_INPUT', payload: promptState.completion });
    dispatch({ type: 'INCREMENT_ITERATION' });
    handleEnhance();
  }}
  iterationCount={promptState.iterationCount}
/>
```

**Step 4: Commit**

```bash
git add src/components/features/prompt-improver/ResultSection.tsx src/app/page.tsx src/i18n/dictionaries/he.json src/i18n/dictionaries/en.json
git commit -m "feat: add one-click 'Improve Again' iteration loop

Feeds current output back as input for re-enhancement.
Shows iteration count badge. Preserves engine selection."
```

---

### Task 14: Mobile Touch Targets & Keyboard Shortcuts

**Files:**
- Modify: `src/app/page.tsx`
- Audit: Various component files for touch target compliance

**Step 1: Audit touch targets**

Run: `grep -rn "onClick\|onPress" src/components/ --include="*.tsx" -l`

For each interactive element, ensure minimum `min-h-11 min-w-11` (44px).
Key areas: mic button, category selector, accordion buttons, copy/save buttons.

**Step 2: Add min-h-11 min-w-11 to small interactive elements**

Apply Tailwind classes `min-h-11 min-w-11` to any button/link under 44px.

**Step 3: Add keyboard shortcuts to page.tsx**

```typescript
// In page.tsx, add useEffect:
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Escape — clear input or close modals
    if (e.key === 'Escape') {
      if (promptState.input) {
        dispatch({ type: 'SET_INPUT', payload: '' });
      }
    }
    // Cmd+Shift+C — copy result
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'c') {
      if (promptState.completion) {
        navigator.clipboard.writeText(promptState.completion);
        dispatch({ type: 'SET_COPIED', payload: true });
        setTimeout(() => dispatch({ type: 'SET_COPIED', payload: false }), 2000);
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [promptState.input, promptState.completion, dispatch]);
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add mobile touch targets (44px min) and keyboard shortcuts

Escape clears input. Cmd+Shift+C copies result to clipboard.
Ensures all interactive elements meet 44px minimum touch target."
```

---

## Section 5: Pro Tier & Analytics

### Task 15: Create Stripe Checkout API Route

**Files:**
- Create: `src/app/api/stripe/checkout/route.ts`

**Step 1: Install Stripe SDK**

Run: `npm install stripe`

**Step 2: Create checkout route**

```typescript
// src/app/api/stripe/checkout/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_PRO_PRICE_ID!,
        quantity: 1,
      }],
      customer_email: user.email,
      metadata: { userId: user.id },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/peroot?upgrade=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/peroot?upgrade=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 3: Commit**

```bash
git add src/app/api/stripe/checkout/route.ts package.json package-lock.json
git commit -m "feat: add Stripe Checkout API route for Pro subscriptions

Creates Stripe checkout session with user metadata.
Requires STRIPE_SECRET_KEY and STRIPE_PRO_PRICE_ID env vars."
```

---

### Task 16: Create Stripe Webhook Handler

**Files:**
- Create: `src/app/api/stripe/webhook/route.ts`

**Step 1: Create webhook route**

```typescript
// src/app/api/stripe/webhook/route.ts
import { NextResponse, NextRequest } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

// Use service role for webhook (no user context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    return NextResponse.json({ error: `Webhook error: ${error.message}` }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (userId) {
        await supabase
          .from('profiles')
          .update({
            plan_tier: 'pro',
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
          })
          .eq('id', userId);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      await supabase
        .from('profiles')
        .update({ plan_tier: 'free' })
        .eq('stripe_customer_id', customerId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

**Step 2: Add Supabase migration for profile columns**

Create SQL migration to add Stripe columns to profiles table:

```sql
-- Add to profiles table if not exists:
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'free';
```

**Step 3: Commit**

```bash
git add src/app/api/stripe/webhook/route.ts
git commit -m "feat: add Stripe webhook handler for subscription lifecycle

Handles checkout.session.completed → upgrade to pro.
Handles customer.subscription.deleted → downgrade to free.
Updates profiles table with stripe_customer_id and plan_tier."
```

---

### Task 17: Analytics Cleanup

**Files:**
- Modify: Multiple files across `src/`

**Step 1: Audit all PostHog tracking calls**

Run: `grep -rn "posthog\|capture(" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test."`

**Step 2: Keep only critical events**

The 7 critical events to keep:
1. `prompt_enhanced` — core conversion
2. `prompt_refined` — iteration usage
3. `signup_completed` — funnel
4. `upgrade_initiated` — revenue
5. `credit_exhausted` — churn signal
6. `engine_selected` — feature usage
7. `error_occurred` — stability

Remove ALL other PostHog `capture()` calls.

**Step 3: Disable autocapture**

In the PostHog initialization file (likely `src/lib/posthog.ts` or `src/app/providers.tsx`):

```typescript
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  autocapture: false, // Disable automatic event capture
  capture_pageview: false, // We'll track manually if needed
  // ... other existing config
});
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: clean up analytics — keep only 7 critical PostHog events

Removes non-essential tracking. Disables autocapture.
Keeps: prompt_enhanced, prompt_refined, signup_completed,
upgrade_initiated, credit_exhausted, engine_selected, error_occurred."
```

---

### Task 18: Credit Usage Dashboard Widget

**Files:**
- Create: `src/components/features/prompt-improver/CreditUsageWidget.tsx`

**Step 1: Create the widget**

```typescript
// src/components/features/prompt-improver/CreditUsageWidget.tsx
'use client';

import { useI18n } from '@/lib/i18n/context';

interface CreditUsageWidgetProps {
  used: number;
  total: number;
  resetDate?: string;
  onUpgrade?: () => void;
}

export default function CreditUsageWidget({ used, total, resetDate, onUpgrade }: CreditUsageWidgetProps) {
  const { t } = useI18n();
  const percentage = total > 0 ? Math.round((used / total) * 100) : 0;

  const barColor =
    percentage >= 100 ? 'bg-red-500' :
    percentage >= 80 ? 'bg-yellow-500' :
    'bg-green-500';

  return (
    <div className="p-3 rounded-lg border border-border/50 space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{t('credits.usage') || 'שימוש בקרדיטים'}</span>
        <span>{used}/{total}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {percentage >= 80 && onUpgrade && (
        <button
          onClick={onUpgrade}
          className="text-xs text-primary hover:underline"
        >
          {percentage >= 100
            ? (t('credits.upgrade_now') || 'שדרג עכשיו')
            : (t('credits.running_low') || `נותרו לך ${total - used} קרדיטים`)}
        </button>
      )}
    </div>
  );
}
```

**Step 2: Add i18n keys**

In `he.json`:
```json
"credits": {
  "usage": "שימוש בקרדיטים",
  "upgrade_now": "שדרג עכשיו",
  "running_low": "הקרדיטים עומדים להיגמר",
  "reset_date": "איפוס ב-"
}
```

In `en.json`:
```json
"credits": {
  "usage": "Credit Usage",
  "upgrade_now": "Upgrade Now",
  "running_low": "Credits running low",
  "reset_date": "Resets on "
}
```

**Step 3: Integrate in UserMenu or sidebar**

Wire `CreditUsageWidget` into the user menu area using data from `usePromptLimits` hook.

**Step 4: Commit**

```bash
git add src/components/features/prompt-improver/CreditUsageWidget.tsx src/i18n/dictionaries/he.json src/i18n/dictionaries/en.json
git commit -m "feat: add credit usage dashboard widget

Shows progress bar with green → yellow → red color transitions.
Links to upgrade when usage exceeds 80%.
Uses existing usePromptLimits hook data."
```

---

### Task 19: Smart Upgrade Nudges

**Files:**
- Create: `src/components/features/prompt-improver/UpgradeNudge.tsx`

**Step 1: Create nudge component**

```typescript
// src/components/features/prompt-improver/UpgradeNudge.tsx
'use client';

import { useI18n } from '@/lib/i18n/context';

interface UpgradeNudgeProps {
  type: 'warning' | 'exhausted';
  remaining?: number;
  resetDate?: string;
  onUpgrade: () => void;
  onDismiss: () => void;
}

export default function UpgradeNudge({ type, remaining, resetDate, onUpgrade, onDismiss }: UpgradeNudgeProps) {
  const { t } = useI18n();

  if (type === 'warning') {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-yellow-700 dark:text-yellow-300">
          {t('nudge.remaining') || `נותרו לך ${remaining} קרדיטים החודש`}
        </span>
        <button onClick={onDismiss} className="text-yellow-600 hover:text-yellow-800 text-xs">
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl p-6 max-w-sm mx-4 space-y-4 shadow-xl">
        <h3 className="text-lg font-semibold text-center">
          {t('nudge.exhausted_title') || 'הקרדיטים נגמרו'}
        </h3>
        <p className="text-sm text-muted-foreground text-center">
          {t('nudge.exhausted_message') || 'שדרג ל-Pro או המתן לאיפוס החודשי'}
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onUpgrade}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium min-h-11"
          >
            {t('nudge.upgrade_to_pro') || 'שדרג ל-Pro'}
          </button>
          <button
            onClick={onDismiss}
            className="w-full py-2.5 rounded-lg border border-border text-muted-foreground text-sm min-h-11"
          >
            {resetDate
              ? `${t('nudge.wait_for_reset') || 'המתן לאיפוס'} — ${resetDate}`
              : (t('nudge.wait_for_reset') || 'המתן לאיפוס')}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Add i18n keys for nudges**

In `he.json`:
```json
"nudge": {
  "remaining": "נותרו לך {{count}} קרדיטים החודש",
  "exhausted_title": "הקרדיטים נגמרו",
  "exhausted_message": "שדרג ל-Pro או המתן לאיפוס החודשי",
  "upgrade_to_pro": "שדרג ל-Pro — ₪34.99/חודש",
  "wait_for_reset": "המתן לאיפוס"
}
```

**Step 3: Wire into page.tsx with usePromptLimits data**

```typescript
import UpgradeNudge from '@/components/features/prompt-improver/UpgradeNudge';

// In JSX:
{credits.remaining <= credits.total * 0.2 && credits.remaining > 0 && (
  <UpgradeNudge
    type="warning"
    remaining={credits.remaining}
    onUpgrade={handleUpgrade}
    onDismiss={() => setShowNudge(false)}
  />
)}
{credits.remaining <= 0 && (
  <UpgradeNudge
    type="exhausted"
    resetDate={credits.resetDate}
    onUpgrade={handleUpgrade}
    onDismiss={() => {}}
  />
)}
```

**Step 4: Add handleUpgrade function**

```typescript
const handleUpgrade = async () => {
  const res = await fetch('/api/stripe/checkout', { method: 'POST' });
  const { url } = await res.json();
  if (url) window.location.href = url;
};
```

**Step 5: Commit**

```bash
git add src/components/features/prompt-improver/UpgradeNudge.tsx src/app/page.tsx src/i18n/dictionaries/he.json src/i18n/dictionaries/en.json
git commit -m "feat: add smart upgrade nudges at 80% and 100% credit usage

Warning banner at 80% usage. Modal at 100% with upgrade/wait options.
Upgrade button triggers Stripe Checkout flow."
```

---

## Final: Build & Smoke Test

### Task 20: Full Build & Verification

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Run lint**

Run: `npm run lint`
Expected: No errors (warnings OK)

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify build and tests pass after full overhaul

All tests pass. Build succeeds. Lint clean.
Overhaul complete: architecture, AI gateway, performance, UX, pro tier."
```

---

## Required Environment Variables (for Pro Tier)

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Estimated Execution Time

| Section | Tasks | Effort |
|---------|-------|--------|
| 1. Architecture | Tasks 1-5 | ~2 days |
| 2. AI Gateway | Tasks 6-8 | ~1.5 days |
| 3. Performance | Tasks 9-10 | ~0.5 days |
| 4. UX | Tasks 11-14 | ~1.5 days |
| 5. Pro Tier | Tasks 15-19 | ~2 days |
| Final | Task 20 | ~0.5 days |
| **Total** | **20 tasks** | **~8 days** |
