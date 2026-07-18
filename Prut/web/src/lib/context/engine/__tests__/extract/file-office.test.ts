import { describe, it, expect } from "vitest";
import {
  extractCsv,
  extractXlsx,
  extractDocx,
  zipTotalUncompressedSize,
} from "../../extract/file-office";

/** Build a minimal ZIP (central directory + EOCD only) claiming `size` bytes uncompressed. */
function fakeZipClaimingUncompressed(size: number): Buffer {
  const cdh = Buffer.alloc(46);
  cdh.writeUInt32LE(0x02014b50, 0); // central-dir header signature
  cdh.writeUInt32LE(size >>> 0, 24); // uncompressed size
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(1, 10); // total entries
  eocd.writeUInt32LE(0, 16); // central-dir offset (cdh starts at buffer offset 0)
  return Buffer.concat([cdh, eocd]);
}

describe("zip decompression-bomb guard", () => {
  it("sums the uncompressed size from the central directory", () => {
    expect(zipTotalUncompressedSize(fakeZipClaimingUncompressed(123456))).toBe(123456);
  });

  it("returns null for a non-zip buffer (guard is then skipped)", () => {
    expect(zipTotalUncompressedSize(Buffer.from("not a zip"))).toBeNull();
  });

  it("rejects an archive that decompresses past the limit", async () => {
    const bomb = fakeZipClaimingUncompressed(200 * 1024 * 1024); // 200MB claimed
    await expect(extractXlsx(bomb)).rejects.toThrow(/exceeds/i);
    await expect(extractDocx(bomb)).rejects.toThrow(/exceeds/i);
  });
});

describe("extractCsv", () => {
  it("formats headers and rows as readable text", async () => {
    const csv = "name,age\nAlice,30\nBob,25\n";
    const r = await extractCsv(Buffer.from(csv));
    expect(r.text).toContain("Columns: name, age");
    expect(r.text).toContain("Row 1");
    expect(r.metadata.rows).toBe(2);
    expect(r.metadata.columns).toBe(2);
  });
});

describe("extractXlsx", () => {
  it("handles basic input", async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["h1", "h2"],
        ["a", "b"],
      ]),
      "Sheet1",
    );
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const r = await extractXlsx(buf);
    expect(r.text).toContain("h1");
    expect(r.metadata.rows).toBe(1);
  });
});

describe("extractDocx", () => {
  it("rejects clearly with empty buffer", async () => {
    await expect(extractDocx(Buffer.from(""))).rejects.toThrow();
  });
});
