import * as Sentry from '@sentry/nextjs';
import type { ContextBlock } from '@/lib/context/engine/types';

export const SMALL_CONTEXT_THRESHOLD = 2_000;

export type CheapModel = 'gemini-2.5-flash-lite' | 'gemini-2.5-flash';

export function selectEngineModel(opts: { blocks: ContextBlock[] }): CheapModel {
  const totalTokens = opts.blocks.reduce((s, b) => s + b.injected.tokenCount, 0);
  const selected: CheapModel =
    totalTokens <= SMALL_CONTEXT_THRESHOLD ? 'gemini-2.5-flash-lite' : 'gemini-2.5-flash';

  Sentry.addBreadcrumb({
    category: 'context-router',
    message: 'selectEngineModel',
    level: 'info',
    data: { selectedModel: selected, tokens: totalTokens, blocks: opts.blocks.length },
  });

  return selected;
}
