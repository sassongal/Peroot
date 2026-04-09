/**
 * Context attachment summary cache.
 *
 * Problem: every enhance call re-sends the full raw attachment content
 * (PDFs, scraped URLs, long text) to the upstream LLM. Even after the
 * 1500/1000-char slices in buildContextSummaryForUserPrompt, a repeat
 * enhance on the same file still pays the full token cost. For heavy
 * users re-refining the same attachment, that's the single biggest
 * unnecessary spend in the whole enhance pipeline.
 *
 * Solution: hash the raw content (sha256), look up a 300-word Hebrew
 * summary in Redis (or an in-memory Map when Redis isn't configured),
 * and substitute the summary back into the attachment before it reaches
 * the engine. First hit pays a small summarization call; every repeat
 * enhance on the same content reuses the cached summary.
 *
 * Fail-safe: any error (Redis down, summarizer failure, timeout) falls
 * back to the original raw content. The cache is an optimization, not a
 * correctness gate — enhance must never break because the cache is sick.
 *
 * Scope: only attachments above SUMMARIZATION_THRESHOLD chars get cached.
 * Short content is cheaper to send as-is than to round-trip through a
 * summarizer.
 */

import crypto from "node:crypto";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";
import type { EngineInput } from "./types";

type Attachment = NonNullable<EngineInput["context"]>[number];

/** Only content longer than this gets summarized. Shorter = cheaper as-is. */
export const SUMMARIZATION_THRESHOLD = 2000;

/** Cache TTL — attachments rarely change; 30 days covers typical re-edit cycles. */
const REDIS_TTL_S = 60 * 60 * 24 * 30;

const KEY_PREFIX = "@peroot/ctxsum:";

// Lazy Redis handle — avoids module-load errors when env vars are absent.
let redis: Redis | null = null;
function getRedis(): Redis | null {
    if (redis) return redis;
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN;
    if (!url || !token) return null;
    redis = new Redis({ url, token });
    return redis;
}

// In-memory fallback — bounded to avoid unbounded growth on long-running workers.
const MEMORY_CACHE_MAX = 500;
const memoryCache = new Map<string, string>();

/** @internal Test-only — reset in-memory cache + lazy Redis handle. */
export function __resetContextCacheForTest(): void {
    memoryCache.clear();
    redis = null;
}

/**
 * Summarizer hook. Pulled out as a function pointer so tests can inject
 * a stub instead of spinning up the real AIGateway. Defaults to the real
 * gateway.generateFull call.
 */
export type Summarizer = (content: string, attachmentName: string) => Promise<string>;

let summarizer: Summarizer | null = null;

/** @internal Test-only — inject a fake summarizer. */
export function __setSummarizerForTest(fn: Summarizer | null): void {
    summarizer = fn;
}

async function defaultSummarizer(content: string, attachmentName: string): Promise<string> {
    // Lazy import to break circular dep potential — context-cache is
    // imported by the route handler, which also transitively imports
    // the gateway. Dynamic import keeps the graph clean.
    const { AIGateway } = await import("@/lib/ai/gateway");
    const system = `אתה מומחה לסיכום מסמכים. סכם את החומר הבא בעברית ל-300 מילים או פחות.
חובה לשמר: כל המספרים, השמות, התאריכים, המושגים המרכזיים, והמבנה הכללי של המסמך.
אל תוסיף הקדמה או סיום — רק את הסיכום עצמו.
אם המסמך כולל סעיפים/פרקים — שמור על הסדר וציין כותרות קצרות.`;
    const prompt = `שם הקובץ: ${attachmentName}\n\nתוכן:\n${content}`;
    const { text } = await AIGateway.generateFull({
        system,
        prompt,
        task: "chain",
        userTier: "pro",
    });
    return text.trim();
}

function getSummarizer(): Summarizer {
    return summarizer ?? defaultSummarizer;
}

/** sha256 of the raw content — deterministic cache key. */
export function hashContent(content: string): string {
    return crypto.createHash("sha256").update(content, "utf8").digest("hex").slice(0, 32);
}

async function readCache(key: string): Promise<string | null> {
    try {
        const r = getRedis();
        if (!r) return memoryCache.get(key) ?? null;
        const value = await r.get<string>(`${KEY_PREFIX}${key}`);
        return value ?? null;
    } catch (e) {
        logger.warn("[context-cache] Redis read failed, falling back to memory:", e);
        return memoryCache.get(key) ?? null;
    }
}

function writeCache(key: string, summary: string): void {
    // Bound in-memory cache — evict oldest on overflow.
    if (memoryCache.size >= MEMORY_CACHE_MAX) {
        const firstKey = memoryCache.keys().next().value;
        if (firstKey) memoryCache.delete(firstKey);
    }
    memoryCache.set(key, summary);

    try {
        const r = getRedis();
        if (!r) return;
        // Fire-and-forget — don't block the enhance request on the write.
        r.set(`${KEY_PREFIX}${key}`, summary, { ex: REDIS_TTL_S }).catch((e) => {
            logger.warn("[context-cache] Redis write failed:", e);
        });
    } catch (e) {
        logger.warn("[context-cache] Redis write threw:", e);
    }
}

/**
 * Summarize an attachment if its content exceeds the threshold and isn't
 * already cached. Returns the (possibly summarized) attachment. On any
 * failure, returns the original attachment untouched.
 */
export async function summarizeAttachment(attachment: Attachment): Promise<Attachment> {
    // Images are always described, not summarized — skip.
    if (attachment.type === "image") return attachment;

    const raw = attachment.content ?? "";
    if (raw.length < SUMMARIZATION_THRESHOLD) return attachment;

    const key = hashContent(raw);
    const cached = await readCache(key);
    if (cached) {
        return { ...attachment, content: cached };
    }

    try {
        const fn = getSummarizer();
        const summary = await fn(raw, attachment.name);
        if (summary && summary.length > 0 && summary.length < raw.length) {
            writeCache(key, summary);
            return { ...attachment, content: summary };
        }
    } catch (e) {
        logger.warn(`[context-cache] Summarization failed for "${attachment.name}":`, e);
    }

    return attachment;
}

/**
 * Summarize an array of attachments in parallel. Preserves order.
 * Returns the original array reference if no context is provided — the
 * route handler can pass result straight through without a null check.
 */
export async function summarizeAttachments(
    attachments: EngineInput["context"]
): Promise<EngineInput["context"]> {
    if (!attachments || attachments.length === 0) return attachments;
    return Promise.all(attachments.map(summarizeAttachment));
}
