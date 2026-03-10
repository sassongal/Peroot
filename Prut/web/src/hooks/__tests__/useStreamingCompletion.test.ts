// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStreamingCompletion } from '../useStreamingCompletion';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useStreamingCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns correct interface', () => {
    const { result } = renderHook(() =>
      useStreamingCompletion({
        onChunk: vi.fn(),
        onDone: vi.fn(),
        onError: vi.fn(),
      })
    );
    expect(result.current.startStream).toBeTypeOf('function');
    expect(result.current.abort).toBeTypeOf('function');
    expect(result.current.isStreaming).toBe(false);
  });

  it('sets isStreaming to true when stream starts', async () => {
    // Create a stream that never closes so we can observe isStreaming=true
    const neverEndingStream = new ReadableStream({
      start() {
        // intentionally never close — keeps isStreaming true
      },
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: neverEndingStream,
    });

    const { result } = renderHook(() =>
      useStreamingCompletion({
        onChunk: vi.fn(),
        onDone: vi.fn(),
        onError: vi.fn(),
      })
    );

    // Start the stream but don't await it (it will hang)
    act(() => {
      result.current.startStream('/api/test', { prompt: 'hello' });
    });

    // After starting, isStreaming should be true
    expect(result.current.isStreaming).toBe(true);

    // Clean up: abort the hanging stream
    act(() => {
      result.current.abort();
    });
  });

  it('calls onError for non-ok response', async () => {
    const onError = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Rate limited' }),
    });

    const { result } = renderHook(() =>
      useStreamingCompletion({
        onChunk: vi.fn(),
        onDone: vi.fn(),
        onError,
      })
    );

    await act(async () => {
      await result.current.startStream('/api/test', { prompt: 'hello' });
    });

    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0][0].message).toBe('Rate limited');
    expect(result.current.isStreaming).toBe(false);
  });

  it('processes stream chunks and calls onChunk then onDone', async () => {
    const onChunk = vi.fn();
    const onDone = vi.fn();

    // Build a readable stream that emits two chunks then closes
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('Hello '));
        controller.enqueue(encoder.encode('World'));
        controller.close();
      },
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: stream,
    });

    const { result } = renderHook(() =>
      useStreamingCompletion({
        onChunk,
        onDone,
        onError: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.startStream('/api/test', { prompt: 'hello' });
    });

    expect(onChunk).toHaveBeenCalledTimes(2);
    expect(onChunk).toHaveBeenNthCalledWith(1, 'Hello ');
    expect(onChunk).toHaveBeenNthCalledWith(2, 'World');
    expect(onDone).toHaveBeenCalledOnce();
    expect(onDone).toHaveBeenCalledWith('Hello World');
    expect(result.current.isStreaming).toBe(false);
  });

  it('sends correct fetch parameters', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.close();
      },
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: stream,
    });

    const { result } = renderHook(() =>
      useStreamingCompletion({
        onChunk: vi.fn(),
        onDone: vi.fn(),
        onError: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.startStream('/api/enhance', { prompt: 'test', tone: 'casual' });
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith('/api/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'test', tone: 'casual' }),
      signal: expect.any(AbortSignal),
    });
  });

  it('abort cancels an in-progress stream', async () => {
    const onError = vi.fn();

    // Stream that never ends
    const neverEndingStream = new ReadableStream({
      start() {
        // intentionally never close
      },
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: neverEndingStream,
    });

    const { result } = renderHook(() =>
      useStreamingCompletion({
        onChunk: vi.fn(),
        onDone: vi.fn(),
        onError,
      })
    );

    act(() => {
      result.current.startStream('/api/test', { prompt: 'hello' });
    });

    expect(result.current.isStreaming).toBe(true);

    act(() => {
      result.current.abort();
    });

    expect(result.current.isStreaming).toBe(false);
    // AbortError should NOT trigger onError
    expect(onError).not.toHaveBeenCalled();
  });

  it('handles missing response body', async () => {
    const onError = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: null,
    });

    const { result } = renderHook(() =>
      useStreamingCompletion({
        onChunk: vi.fn(),
        onDone: vi.fn(),
        onError,
      })
    );

    await act(async () => {
      await result.current.startStream('/api/test', { prompt: 'hello' });
    });

    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0].message).toBe('No response body');
    expect(result.current.isStreaming).toBe(false);
  });

  it('handles json parse failure on error response', async () => {
    const onError = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => { throw new Error('invalid json'); },
    });

    const { result } = renderHook(() =>
      useStreamingCompletion({
        onChunk: vi.fn(),
        onDone: vi.fn(),
        onError,
      })
    );

    await act(async () => {
      await result.current.startStream('/api/test', { prompt: 'hello' });
    });

    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0].message).toBe('HTTP 500');
  });
});
