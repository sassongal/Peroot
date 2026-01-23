import { NextResponse } from 'next/server';
import { promptManager } from '@/lib/prompts/prompt-manager';

/**
 * POST /api/prompts/sync
 * 
 * Invalidates the prompt cache.
 * Call this after updating prompts in the admin UI.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { prompt_key } = body;

    // Invalidate cache for specific key or all
    promptManager.invalidateCache(prompt_key);

    return NextResponse.json({ 
      success: true,
      message: prompt_key 
        ? `Cache invalidated for: ${prompt_key}` 
        : 'All cache cleared'
    });
  } catch (error) {
    console.error('[Prompts Sync] Error:', error);
    return NextResponse.json(
      { error: 'Failed to sync cache' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/prompts/sync
 * 
 * Returns cache statistics
 */
export async function GET() {
  try {
    const stats = promptManager.getCacheStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('[Prompts Sync] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get cache stats' },
      { status: 500 }
    );
  }
}
