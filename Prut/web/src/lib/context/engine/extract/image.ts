/**
 * Image extraction is a pass-through: the ENRICH stage does the real work
 * via Gemini vision. We only normalize bytes → base64 here and leave `text`
 * empty (the unified ExtractResult carries image bytes on `imageBase64`).
 */
import type { ExtractResult } from "./index";

const SUPPORTED: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function extractImage(buffer: Buffer, mimeType: string): Promise<ExtractResult> {
  if (!SUPPORTED.has(mimeType)) {
    throw new Error(`פורמט תמונה לא נתמך: ${mimeType}. נתמכים: JPG, PNG, WEBP, GIF`);
  }
  const base64 = buffer.toString("base64");
  return {
    text: "",
    imageBase64: base64,
    imageMimeType: mimeType,
    metadata: {
      format: "image",
      mimeType,
      sizeMb: Math.round((buffer.length / (1024 * 1024)) * 100) / 100,
    },
  };
}
