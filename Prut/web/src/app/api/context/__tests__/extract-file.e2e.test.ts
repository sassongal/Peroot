// src/app/api/context/__tests__/extract-file.e2e.test.ts
import { describe, it, expect, vi, beforeAll } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import os from "node:os";
import path from "node:path";

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { plan_tier: "pro" } }) }) }),
    }),
  }),
}));
vi.mock("@/lib/context/engine/extraction-rate-limit", () => ({
  checkExtractionLimit: async () => ({
    allowed: true,
    remaining: 100,
    limit: 100,
    resetIn: 3600,
    rollback: async () => {},
  }),
}));
vi.mock("@/lib/context/engine/enrich", () => ({
  enrichContent: async () => ({
    title: "Sample",
    documentType: "generic",
    summary: "א".repeat(120),
    keyFacts: ["fact1"],
    entities: [],
  }),
}));
vi.mock("@/lib/context/engine/cache", () => ({
  getCachedBlock: async () => null,
  putCachedBlock: async () => {},
}));

import { POST } from "../extract-file/route";

let pdfPath: string;

beforeAll(async () => {
  // Generate a minimal PDF using pdf-lib so we don't commit a binary fixture.
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  page.drawText("Sample PDF for context engine e2e test", { x: 50, y: 700, size: 12 });
  const bytes = await doc.save();

  const tmpDir = path.join(os.tmpdir(), "peroot-test-fixtures");
  mkdirSync(tmpDir, { recursive: true });
  pdfPath = path.join(tmpDir, "sample.pdf");
  writeFileSync(pdfPath, bytes);
});

describe("POST /api/context/extract-file (e2e)", () => {
  it("returns a ContextBlock for a real PDF fixture", async () => {
    const { readFileSync } = await import("node:fs");
    const pdf = readFileSync(resolve(pdfPath));
    const form = new FormData();
    form.set("file", new File([pdf], "sample.pdf", { type: "application/pdf" }));
    const req = new Request("http://t", { method: "POST", body: form });
    const res = await POST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(200);
    // Route now returns SSE — parse the stream to find the block event
    const text = await res.text();
    const lines = text.split("\n\n").filter(Boolean);
    let block: Record<string, unknown> | undefined;
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const parsed = JSON.parse(line.slice(5).trim()) as Record<string, unknown>;
      if (parsed.block) {
        block = parsed.block as Record<string, unknown>;
        break;
      }
    }
    expect(block?.type).toBe("file");
    expect((block?.display as Record<string, unknown>)?.title).toBe("Sample");
    expect(block?.stage).toBe("ready");
    expect((block?.injected as Record<string, unknown>)?.tokenCount as number).toBeGreaterThan(0);
  });
});
