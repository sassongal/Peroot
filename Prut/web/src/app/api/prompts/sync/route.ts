import { NextResponse } from 'next/server';
import { promptManager } from '@/lib/prompts/prompt-manager';
import { invalidateEngineCache } from '@/lib/engines';
import { validateAdminSession } from '@/lib/admin/admin-security';

/**
 * POST /api/prompts/sync
 * 
 * Invalidates the prompt cache.
 * Call this after updating prompts in the admin UI.
 */
export async function POST(req: Request) {
  try {
    const { error, user } = await validateAdminSession();
    if (error || !user) {
        return NextResponse.json({ error: error || 'Forbidden' }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { prompt_key, mode } = body;

    // Invalidate both caches
    promptManager.invalidateCache(prompt_key);
    invalidateEngineCache(mode);

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
    const { error, user } = await validateAdminSession();
    if (error || !user) {
        return NextResponse.json({ error: error || 'Forbidden' }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

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
