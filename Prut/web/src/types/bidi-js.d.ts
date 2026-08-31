declare module "bidi-js" {
  interface EmbeddingLevelsResult {
    levels: Uint8Array;
    paragraphs: { start: number; end: number; level: number }[];
  }
  interface Bidi {
    getEmbeddingLevels(text: string, explicitDirection?: "ltr" | "rtl"): EmbeddingLevelsResult;
    getReorderSegments(
      text: string,
      embeddingLevelsResult: EmbeddingLevelsResult,
      start?: number,
      end?: number,
    ): [number, number][];
    // Takes the raw levels ARRAY (result.levels), unlike getReorderSegments
    // which takes the whole result object — bidi-js indexes it directly.
    getMirroredCharactersMap(
      text: string,
      embeddingLevels: Uint8Array,
      start?: number,
      end?: number,
    ): Map<number, string>;
    getMirroredCharacter(char: string): string | null;
    getReorderedString(text: string, embeddingLevelsResult: EmbeddingLevelsResult): string;
  }
  export default function bidiFactory(): Bidi;
}
