import { NextResponse } from 'next/server';
import { promptManager } from '@/lib/prompts/prompt-manager';
import { invalidateEngineCache } from '@/lib/engines';
import { withAdmin } from '@/lib/api-middleware';
import { logger } from "@/lib/logger";

/**
 * POST /api/prompts/sync
 *
 * Invalidates the prompt cache.
 * Call this after updating prompts in the admin UI.
 */
export const POST = withAdmin(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { prompt_key, mode } = body;

    promptManager.invalidateCache(prompt_key);
    invalidateEngineCache(mode);

    return NextResponse.json({
      success: true,
      message: prompt_key
        ? `Cache invalidated for: ${prompt_key}`
        : 'All cache cleared',
    });
  } catch (error) {
    logger.error('[Prompts Sync] Error:', error);
    return NextResponse.json({ error: 'Failed to sync cache' }, { status: 500 });
  }
});

/**
 * GET /api/prompts/sync
 *
 * Returns cache statistics
 */
export const GET = withAdmin(async () => {
  try {
    const stats = promptManager.getCacheStats();
    return NextResponse.json(stats);
  } catch (error) {
    logger.error('[Prompts Sync] Error:', error);
    return NextResponse.json({ error: 'Failed to get cache stats' }, { status: 500 });
  }
});
