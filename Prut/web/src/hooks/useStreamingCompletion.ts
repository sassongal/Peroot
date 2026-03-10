'use client';

import { useCallback, useRef, useState } from 'react';

interface StreamingOptions {
  onChunk: (chunk: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
  /** Called when the stream is cut mid-response. Receives the partial text accumulated so far. */
  onInterrupted?: (partialText: string) => void;
}

export function useStreamingCompletion({ onChunk, onDone, onError, onInterrupted }: StreamingOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(
    async (url: string, body: Record<string, unknown>) => {
      abort();

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
          const errorData = await response
            .json()
            .catch(() => ({ error: `HTTP ${response.status}` }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            accumulated += chunk;
            onChunk(chunk);
          }
        } catch (streamError) {
          // Mid-stream failure — signal the caller that the stream was cut short.
          if (accumulated) {
            onInterrupted?.(accumulated);
          }
          throw streamError;
        }

        onDone(accumulated);
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return;
        onError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [abort, onChunk, onDone, onError, onInterrupted]
  );

  return { startStream, abort, isStreaming };
}
