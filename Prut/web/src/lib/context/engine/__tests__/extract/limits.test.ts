import { describe, it, expect } from "vitest";
import {
  readCapped,
  zipTotalUncompressedSize,
  assertArchiveWithinLimit,
} from "../../extract/limits";

/** Build a minimal ZIP (central directory + EOCD only) claiming `size` bytes uncompressed. */
function fakeZipClaimingUncompressed(size: number): Buffer {
  const cdh = Buffer.alloc(46);
  cdh.writeUInt32LE(0x02014b50, 0); // central-dir header signature
  cdh.writeUInt32LE(size >>> 0, 24); // uncompressed size
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(1, 10); // total entries
  eocd.writeUInt32LE(0, 16); // central-dir offset
  return Buffer.concat([cdh, eocd]);
}

describe("readCapped", () => {
  it("aborts a body that streams past the cap", async () => {
    const chunk = new Uint8Array(1024 * 1024); // 1MB
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= 4) {
          controller.close();
          return;
        }
        sent++;
        controller.enqueue(chunk);
      },
    });
    await expect(readCapped(new Response(body), 2 * 1024 * 1024)).rejects.toThrow(/גדול מדי/);
    expect(sent).toBeLessThan(4); // stopped before consuming all 4MB
  });

  it("returns the full body when under the cap", async () => {
    expect(await readCapped(new Response("hello world"), 1000)).toBe("hello world");
  });
});

describe("zip decompression-bomb guard", () => {
  it("sums the uncompressed size from the central directory", () => {
    expect(zipTotalUncompressedSize(fakeZipClaimingUncompressed(123456))).toBe(123456);
  });

  it("returns null for a non-zip buffer (guard then skipped)", () => {
    expect(zipTotalUncompressedSize(Buffer.from("not a zip"))).toBeNull();
  });

  it("assertArchiveWithinLimit throws over the cap, passes otherwise", () => {
    expect(() => assertArchiveWithinLimit(fakeZipClaimingUncompressed(200 * 1024 * 1024))).toThrow(
      /exceeds/i,
    );
    expect(() => assertArchiveWithinLimit(Buffer.from("not a zip"))).not.toThrow();
  });
});
