import { describe, it, expect, beforeEach, vi } from "vitest";

// vi.mock is hoisted above normal `const` declarations, so the mock fns must
// live inside vi.hoisted() to be defined when the factory runs.
const { mockGet, mockSet } = vi.hoisted(() => ({
    mockGet: vi.fn(),
    mockSet: vi.fn(),
}));

vi.mock("@upstash/redis", () => {
    class Redis {
        get = mockGet;
        set = mockSet;
        constructor(_opts: unknown) {}
    }
    return { Redis };
});

// Silence logger noise in test output.
vi.mock("@/lib/logger", () => ({
    logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import {
    buildCacheKey,
    getCached,
    setCached,
    ENGINE_VERSION,
    __resetRedisForTest,
} from "../enhance-cache";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
    __resetRedisForTest();
    process.env = {
        ...ORIGINAL_ENV,
        UPSTASH_REDIS_REST_URL: "https://fake.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "fake-token",
        ENHANCE_CACHE_ENABLED: "true",
    };
});

describe("buildCacheKey", () => {
    const userA = "user-a-uuid";

    it("returns null for refinement requests", () => {
        const key = buildCacheKey({
            prompt: "write a poem about the sea",
            userId: userA,
            isRefinement: true,
        });
        expect(key).toBeNull();
    });

    it("returns null when userId is missing (guests bypass cache)", () => {
        const key = buildCacheKey({ prompt: "write a poem" });
        expect(key).toBeNull();
    });

    it("returns null when the request has context attachments", () => {
        const key = buildCacheKey({
            prompt: "summarize this",
            userId: userA,
            hasContext: true,
        });
        expect(key).toBeNull();
    });

    it("returns null when the request has personalization loaded", () => {
        const key = buildCacheKey({
            prompt: "write a poem",
            userId: userA,
            hasPersonalization: true,
        });
        expect(key).toBeNull();
    });

    it("normalizes prompt whitespace, case, and trailing punctuation", () => {
        const a = buildCacheKey({ prompt: "Write a Poem!", userId: userA });
        const b = buildCacheKey({ prompt: "  write   a poem  ", userId: userA });
        const c = buildCacheKey({ prompt: "write a poem.", userId: userA });
        expect(a).toBeTruthy();
        expect(a).toBe(b);
        expect(a).toBe(c);
    });

    it("produces different keys for different mode/tone/category/targetModel", () => {
        const base = { prompt: "write a poem", userId: userA };
        const keys = new Set([
            buildCacheKey(base),
            buildCacheKey({ ...base, mode: "IMAGE_GENERATION" }),
            buildCacheKey({ ...base, tone: "Playful" }),
            buildCacheKey({ ...base, category: "שירה" }),
            buildCacheKey({ ...base, targetModel: "claude" }),
        ]);
        expect(keys.size).toBe(5);
    });

    it("produces different keys for different users (no cross-user leak)", () => {
        const keyA = buildCacheKey({ prompt: "write a poem", userId: "user-a" });
        const keyB = buildCacheKey({ prompt: "write a poem", userId: "user-b" });
        expect(keyA).toBeTruthy();
        expect(keyB).toBeTruthy();
        expect(keyA).not.toBe(keyB);
    });

    it("includes the user id in the key path for GDPR bulk deletion", () => {
        const key = buildCacheKey({ prompt: "hello", userId: "user-xyz" });
        expect(key).toContain(":user:user-xyz:");
    });

    it("includes the engine version in the key prefix", () => {
        const key = buildCacheKey({ prompt: "hello", userId: userA });
        expect(key).toContain(`peroot:enhance:${ENGINE_VERSION}`);
    });
});

describe("getCached", () => {
    it("returns null for a null key", async () => {
        const result = await getCached(null);
        expect(result).toBeNull();
        expect(mockGet).not.toHaveBeenCalled();
    });

    it("returns the cached value on a hit", async () => {
        mockGet.mockResolvedValueOnce({
            text: "cached output",
            modelId: "gemini-2.5-flash",
            cachedAt: 123,
        });
        const result = await getCached("peroot:enhance:v1:abc");
        expect(mockGet).toHaveBeenCalledWith("peroot:enhance:v1:abc");
        expect(result).toEqual({
            text: "cached output",
            modelId: "gemini-2.5-flash",
            cachedAt: 123,
        });
    });

    it("returns null on a miss", async () => {
        mockGet.mockResolvedValueOnce(null);
        const result = await getCached("peroot:enhance:v1:abc");
        expect(result).toBeNull();
    });

    it("falls through to null when Redis throws", async () => {
        mockGet.mockRejectedValueOnce(new Error("upstash timeout"));
        const result = await getCached("peroot:enhance:v1:abc");
        expect(result).toBeNull();
    });

    it("returns null when ENHANCE_CACHE_ENABLED is false (kill switch)", async () => {
        process.env.ENHANCE_CACHE_ENABLED = "false";
        const result = await getCached("peroot:enhance:v1:abc");
        expect(result).toBeNull();
        expect(mockGet).not.toHaveBeenCalled();
    });

    it("returns null when Redis env vars are missing", async () => {
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.REDIS_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
        delete process.env.REDIS_TOKEN;
        __resetRedisForTest();
        const result = await getCached("peroot:enhance:v1:abc");
        expect(result).toBeNull();
    });
});

describe("setCached", () => {
    it("does nothing for a null key", async () => {
        await setCached(null, { text: "x", modelId: "gemini-2.5-flash", cachedAt: 1 });
        expect(mockSet).not.toHaveBeenCalled();
    });

    it("writes the value with a TTL", async () => {
        mockSet.mockResolvedValueOnce("OK");
        await setCached("peroot:enhance:v1:abc", {
            text: "out",
            modelId: "gemini-2.5-flash",
            cachedAt: 1,
        });
        expect(mockSet).toHaveBeenCalledWith(
            "peroot:enhance:v1:abc",
            expect.objectContaining({ text: "out" }),
            expect.objectContaining({ ex: expect.any(Number) })
        );
    });

    it("swallows Redis errors so callers never see them", async () => {
        mockSet.mockRejectedValueOnce(new Error("upstash down"));
        await expect(
            setCached("peroot:enhance:v1:abc", { text: "out", modelId: "gemini-2.5-flash", cachedAt: 1 })
        ).resolves.toBeUndefined();
    });
});
