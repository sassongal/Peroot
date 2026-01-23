/**
 * Prompt Cache
 * 
 * In-memory cache for AI prompts with TTL expiration.
 * Reduces database calls and improves API response time.
 */

interface CacheEntry {
  content: string;
  timestamp: number;
}

class PromptCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check expiry
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.content;
  }

  set(key: string, content: string): void {
    this.cache.set(key, { 
      content, 
      timestamp: Date.now() 
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Stats for monitoring
  size(): number {
    return this.cache.size;
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const promptCache = new PromptCache();
