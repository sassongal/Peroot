/**
 * context-cache tests.
 *
 * What we guard:
 *
 * 1. Short content bypasses the cache entirely (below threshold).
 * 2. Long content gets summarized on first call, served from cache on
 *    the second — the summarizer must be invoked exactly once.
 * 3. Identical content on two different "attachments" collapses to a
 *    single cache key (hash-based, not name-based).
 * 4. Summarizer failures fall back to the original raw content — the
 *    enhance path must never throw because the cache is sick.
 * 5. Images are never summarized (they're pre-described by the OCR step).
 * 6. hashContent is deterministic and content-addressable.
 *
 * Redis is NOT mocked — tests exercise the in-memory fallback path by
 * unsetting Upstash env vars in beforeEach. That's the same path used
 * by local dev and Vercel previews without Upstash bindings.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    summarizeAttachment,
    summarizeAttachments,
    hashContent,
    __resetContextCacheForTest,
    __setSummarizerForTest,
    SUMMARIZATION_THRESHOLD,
} from "../context-cache";

function longText(prefix: string): string {
    // Pad past the threshold with a deterministic, unique-per-prefix body.
    return `${prefix}: ` + prefix.repeat(SUMMARIZATION_THRESHOLD);
}

beforeEach(() => {
    __resetContextCacheForTest();
    __setSummarizerForTest(null);
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.REDIS_URL;
    delete process.env.REDIS_TOKEN;
});

describe("hashContent", () => {
    it("is deterministic for the same input", () => {
        expect(hashContent("hello world")).toBe(hashContent("hello world"));
    });

    it("differs for different inputs", () => {
        expect(hashContent("hello world")).not.toBe(hashContent("hello world!"));
    });

    it("returns a 32-char slice (fits Redis key budget)", () => {
        expect(hashContent("anything").length).toBe(32);
    });
});

describe("summarizeAttachment — threshold", () => {
    it("passes short content through untouched and never calls the summarizer", async () => {
        const summarizer = vi.fn().mockResolvedValue("SHOULD NOT BE CALLED");
        __setSummarizerForTest(summarizer);

        const attachment = {
            type: "file" as const,
            name: "small.txt",
            content: "a tiny doc",
            format: "txt",
        };
        const result = await summarizeAttachment(attachment);

        expect(result).toEqual(attachment);
        expect(summarizer).not.toHaveBeenCalled();
    });

    it("never summarizes images (they're pre-described)", async () => {
        const summarizer = vi.fn().mockResolvedValue("SHOULD NOT BE CALLED");
        __setSummarizerForTest(summarizer);

        const attachment = {
            type: "image" as const,
            name: "huge.png",
            // Even well above threshold:
            content: longText("image-content"),
            description: "a visual description",
        };
        const result = await summarizeAttachment(attachment);

        expect(result).toEqual(attachment);
        expect(summarizer).not.toHaveBeenCalled();
    });
});

describe("summarizeAttachment — cache hit / miss", () => {
    it("summarizes long content on first call and serves from cache on second", async () => {
        const summarizer = vi.fn().mockResolvedValue("a short summary");
        __setSummarizerForTest(summarizer);

        const attachment = {
            type: "file" as const,
            name: "contract.pdf",
            content: longText("contract"),
            format: "pdf",
        };

        const first = await summarizeAttachment(attachment);
        expect(first.content).toBe("a short summary");
        expect(summarizer).toHaveBeenCalledTimes(1);

        // Second call on the exact same content — must NOT re-invoke.
        const second = await summarizeAttachment(attachment);
        expect(second.content).toBe("a short summary");
        expect(summarizer).toHaveBeenCalledTimes(1);
    });

    it("collapses identical content under different attachment names to one cache key", async () => {
        const summarizer = vi.fn().mockResolvedValue("shared summary");
        __setSummarizerForTest(summarizer);

        const content = longText("shared-body");
        const a = { type: "file" as const, name: "a.pdf", content, format: "pdf" };
        const b = { type: "file" as const, name: "b.pdf", content, format: "pdf" };

        await summarizeAttachment(a);
        await summarizeAttachment(b);

        // Same content → same hash → same cache entry → one summarizer call.
        expect(summarizer).toHaveBeenCalledTimes(1);
    });

    it("treats different content as separate cache entries", async () => {
        const summarizer = vi.fn().mockImplementation(async (content: string) => `sum:${content.slice(0, 8)}`);
        __setSummarizerForTest(summarizer);

        const a = { type: "file" as const, name: "a.pdf", content: longText("alpha") };
        const b = { type: "file" as const, name: "b.pdf", content: longText("beta") };

        const aResult = await summarizeAttachment(a);
        const bResult = await summarizeAttachment(b);

        expect(summarizer).toHaveBeenCalledTimes(2);
        expect(aResult.content).not.toBe(bResult.content);
    });
});

describe("summarizeAttachment — failure modes", () => {
    it("falls back to original content when the summarizer throws", async () => {
        const summarizer = vi.fn().mockRejectedValue(new Error("LLM down"));
        __setSummarizerForTest(summarizer);

        const attachment = {
            type: "file" as const,
            name: "broken.pdf",
            content: longText("broken"),
        };
        const result = await summarizeAttachment(attachment);

        // Critical: the original raw content must still be there.
        expect(result.content).toBe(attachment.content);
        expect(summarizer).toHaveBeenCalledTimes(1);
    });

    it("falls back when the summarizer returns an empty string", async () => {
        const summarizer = vi.fn().mockResolvedValue("");
        __setSummarizerForTest(summarizer);

        const attachment = {
            type: "file" as const,
            name: "empty-summary.pdf",
            content: longText("empty"),
        };
        const result = await summarizeAttachment(attachment);

        expect(result.content).toBe(attachment.content);
    });

    it("falls back when the summary is longer than the original (no win)", async () => {
        const original = longText("short");
        const summarizer = vi.fn().mockResolvedValue(original + "...but longer");
        __setSummarizerForTest(summarizer);

        const attachment = {
            type: "file" as const,
            name: "bad.pdf",
            content: original,
        };
        const result = await summarizeAttachment(attachment);

        expect(result.content).toBe(original);
    });

    it("failed summarization is not cached (next call retries)", async () => {
        const summarizer = vi
            .fn()
            .mockRejectedValueOnce(new Error("transient"))
            .mockResolvedValueOnce("recovered summary");
        __setSummarizerForTest(summarizer);

        const attachment = {
            type: "file" as const,
            name: "flaky.pdf",
            content: longText("flaky"),
        };

        const first = await summarizeAttachment(attachment);
        expect(first.content).toBe(attachment.content); // fell back

        const second = await summarizeAttachment(attachment);
        expect(second.content).toBe("recovered summary"); // retry succeeded
        expect(summarizer).toHaveBeenCalledTimes(2);
    });
});

describe("summarizeAttachments (batch)", () => {
    it("returns undefined input as-is", async () => {
        expect(await summarizeAttachments(undefined)).toBeUndefined();
    });

    it("returns empty array as-is", async () => {
        const empty: never[] = [];
        expect(await summarizeAttachments(empty)).toBe(empty);
    });

    it("summarizes all entries in parallel, preserving order", async () => {
        const summarizer = vi.fn().mockImplementation(async (_content: string, name: string) => `sum-of-${name}`);
        __setSummarizerForTest(summarizer);

        const result = await summarizeAttachments([
            { type: "file", name: "first.pdf", content: longText("first") },
            { type: "file", name: "second.pdf", content: longText("second") },
        ]);

        expect(result?.[0].content).toBe("sum-of-first.pdf");
        expect(result?.[1].content).toBe("sum-of-second.pdf");
    });

    it("a single failure doesn't block other attachments", async () => {
        const summarizer = vi.fn().mockImplementation(async (_content: string, name: string) => {
            if (name === "broken.pdf") throw new Error("LLM down");
            return `sum-of-${name}`;
        });
        __setSummarizerForTest(summarizer);

        const brokenContent = longText("broken");
        const result = await summarizeAttachments([
            { type: "file", name: "ok.pdf", content: longText("ok") },
            { type: "file", name: "broken.pdf", content: brokenContent },
        ]);

        expect(result?.[0].content).toBe("sum-of-ok.pdf");
        // Broken one fell back to raw.
        expect(result?.[1].content).toBe(brokenContent);
    });
});
