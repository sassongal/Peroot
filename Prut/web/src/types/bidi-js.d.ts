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
    getMirroredCharactersMap(
      text: string,
      embeddingLevelsResult: EmbeddingLevelsResult,
      start?: number,
      end?: number,
    ): Map<number, string>;
    getMirroredCharacter(char: string): string | null;
    getReorderedString(text: string, embeddingLevelsResult: EmbeddingLevelsResult): string;
  }
  export default function bidiFactory(): Bidi;
}
