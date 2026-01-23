/**
 * Prompt Manager
 * 
 * Centralized manager for fetching AI prompts with:
 * - In-memory cache (5min TTL)
 * - Database fallback
 * - Hardcoded fallback
 * - Variable interpolation
 */

import { createClient } from '@/lib/supabase/server';
import { promptCache } from './prompt-cache';
import { FALLBACK_PROMPTS } from './prompt-fallbacks';

export class PromptManager {
  private static instance: PromptManager;
  
  private constructor() {}
  
  static getInstance(): PromptManager {
    if (!this.instance) {
      this.instance = new PromptManager();
    }
    return this.instance;
  }

  /**
   * Get a prompt by key with variable interpolation
   * 
   * @param key - Prompt key (e.g., "prompt_generator_v1")
   * @param variables - Variables to interpolate (e.g., { language: "Hebrew", tone: "Professional" })
   * @returns Interpolated prompt content
   */
  async getPrompt(key: string, variables: Record<string, string> = {}): Promise<string> {
    // 1. Check cache
    const cacheKey = this.getCacheKey(key, variables);
    const cached = promptCache.get(cacheKey);
    if (cached) {
      console.log(`[PromptManager] Cache hit: ${key}`);
      return cached;
    }

    // 2. Fetch from Supabase
    let template: string | null = null;
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('prompt_content')
        .eq('prompt_key', key)
        .eq('is_active', true)
        .single();

      if (data && !error) {
        template = data.prompt_content;
        console.log(`[PromptManager] DB hit: ${key}`);
      } else {
        console.warn(`[PromptManager] DB miss: ${key}`, error);
      }
    } catch (error) {
      console.error('[PromptManager] Failed to fetch from DB:', error);
    }

    // 3. Fallback to hardcoded
    if (!template) {
      template = FALLBACK_PROMPTS[key];
      if (template) {
        console.warn(`[PromptManager] Using fallback: ${key}`);
      } else {
        console.error(`[PromptManager] No fallback found: ${key}`);
        return '';
      }
    }

    // 4. Interpolate variables
    const interpolated = this.interpolate(template, variables);

    // 5. Cache result
    promptCache.set(cacheKey, interpolated);
    
    return interpolated;
  }

  /**
   * Interpolate variables in template
   * Supports {{variable}} syntax
   */
  private interpolate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] ?? match; // Keep placeholder if variable not provided
    });
  }

  /**
   * Generate cache key including variables for proper cache isolation
   */
  private getCacheKey(key: string, variables: Record<string, string>): string {
    const varStr = Object.keys(variables)
      .sort()
      .map(k => `${k}:${variables[k]}`)
      .join('|');
    return varStr ? `${key}|${varStr}` : key;
  }

  /**
   * Invalidate cache for a specific key or all keys
   */
  invalidateCache(key?: string): void {
    if (key) {
      // Delete all cache entries starting with this key
      const stats = promptCache.getStats();
      stats.keys.forEach(cacheKey => {
        if (cacheKey.startsWith(key)) {
          promptCache.delete(cacheKey);
        }
      });
      console.log(`[PromptManager] Invalidated cache: ${key}`);
    } else {
      promptCache.clear();
      console.log('[PromptManager] Cleared all cache');
    }
  }

  /**
   * Get cache statistics (for monitoring)
   */
  getCacheStats() {
    return promptCache.getStats();
  }
}

// Export singleton instance
export const promptManager = PromptManager.getInstance();
