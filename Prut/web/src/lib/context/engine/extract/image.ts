/**
 * Image extraction is a pass-through: the ENRICH stage does the real work
 * via Gemini vision. We only normalize bytes → base64 data URL here.
 */
interface ImageExtractionResult {
  base64: string;
  dataUrl: string;
  metadata: {
    format: 'image';
    mimeType: string;
    sizeMb: number;
  };
}

const SUPPORTED: ReadonlySet<string> = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
]);

export async function extractImage(
  buffer: Buffer,
  mimeType: string,
): Promise<ImageExtractionResult> {
  if (!SUPPORTED.has(mimeType)) {
    throw new Error(`פורמט תמונה לא נתמך: ${mimeType}. נתמכים: JPG, PNG, WEBP, GIF`);
  }
  const base64 = buffer.toString('base64');
  return {
    base64,
    dataUrl: `data:${mimeType};base64,${base64}`,
    metadata: {
      format: 'image',
      mimeType,
      sizeMb: Math.round((buffer.length / (1024 * 1024)) * 100) / 100,
    },
  };
}
