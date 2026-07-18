import type { ExtractResult } from "./index";

export async function extractText(buffer: Buffer): Promise<ExtractResult> {
  const text = buffer.toString("utf-8");
  return { text, metadata: { format: "txt", characters: text.length } };
}
