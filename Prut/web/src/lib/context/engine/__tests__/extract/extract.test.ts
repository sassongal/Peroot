import { describe, it, expect } from "vitest";
import { extract } from "../../extract";

describe("extract seam dispatch", () => {
  it("routes image input to the image adapter (empty text + base64)", async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]);
    const r = await extract({ kind: "image", buffer: png, mimeType: "image/png" });
    expect(r.text).toBe("");
    expect(r.imageBase64).toBe(png.toString("base64"));
    expect(r.imageMimeType).toBe("image/png");
    expect(r.metadata.format).toBe("image");
  });

  it("routes file input to the right format adapter (csv by extension)", async () => {
    const r = await extract({
      kind: "file",
      buffer: Buffer.from("a,b\n1,2\n"),
      filename: "x.csv",
      mimeType: "text/csv",
    });
    expect(r.metadata.format).toBe("csv");
    expect(r.text).toContain("Columns: a, b");
    expect(r.metadata.rows).toBe(1);
  });

  it("rejects an oversized file before dispatch", async () => {
    const big = Buffer.alloc(11 * 1024 * 1024);
    await expect(
      extract({ kind: "file", buffer: big, filename: "x.txt", mimeType: "text/plain" }),
    ).rejects.toThrow(/exceeds/i);
  });
});
