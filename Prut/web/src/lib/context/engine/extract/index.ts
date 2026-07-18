import { MAX_FILE_SIZE_MB } from "./limits";

export { MAX_FILE_SIZE_MB } from "./limits";

export const SUPPORTED_FILE_EXTENSIONS: Record<string, string> = {
  pdf: "pdf",
  docx: "docx",
  txt: "txt",
  csv: "csv",
  xlsx: "xlsx",
  xls: "xlsx",
};

/** The format discriminator carried on every extraction's metadata. */
export type ExtractFormat = "url" | "pdf" | "txt" | "docx" | "xlsx" | "csv" | "image";

/**
 * The single metadata shape every adapter speaks. A superset of the per-source
 * fields — most are optional and only populated by the relevant adapter.
 */
export interface ExtractMetadata {
  format: ExtractFormat;
  // url
  title?: string;
  author?: string;
  publishedTime?: string;
  sourceUrl?: string;
  usedFallback?: "jina";
  // pdf
  pages?: number;
  // text
  characters?: number;
  // office
  rows?: number;
  columns?: number;
  sheets?: number;
  sheetName?: string;
  warnings?: string[];
  // image
  mimeType?: string;
  sizeMb?: number;
}

/**
 * The single result every extract adapter returns. Text-bearing sources
 * (url/pdf/txt/office) fill `text`; images fill `imageBase64`/`imageMimeType`
 * and leave `text` empty (the ENRICH stage does the vision work later).
 */
export interface ExtractResult {
  text: string;
  imageBase64?: string;
  imageMimeType?: string;
  metadata: ExtractMetadata;
}

/** Discriminated input to the extract seam — one shape per source kind. */
export type ExtractInput =
  | { kind: "url"; url: string; jinaFallback: boolean }
  | { kind: "file"; buffer: Buffer; filename: string; mimeType: string }
  | { kind: "image"; buffer: Buffer; mimeType: string };

/**
 * The extract seam. One entry, one dispatch, exhaustive over `kind`. Heavy
 * parsers (pdfjs, mammoth, xlsx, jsdom) are dynamically imported so a route that
 * only handles images never loads them.
 */
export async function extract(input: ExtractInput): Promise<ExtractResult> {
  switch (input.kind) {
    case "url": {
      const { extractUrl } = await import("./url");
      return extractUrl(input.url, { jinaFallback: input.jinaFallback });
    }
    case "image": {
      const { extractImage } = await import("./image");
      return extractImage(input.buffer, input.mimeType);
    }
    case "file":
      return dispatchFile(input.buffer, input.filename, input.mimeType);
  }
}

/** Route a file buffer to the right format extractor. Private to the seam. */
async function dispatchFile(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<ExtractResult> {
  const sizeMb = buffer.length / (1024 * 1024);
  if (sizeMb > MAX_FILE_SIZE_MB) {
    throw new Error(`File size ${sizeMb.toFixed(1)}MB exceeds ${MAX_FILE_SIZE_MB}MB`);
  }
  const format = resolveFormat(mimeType, filename);
  switch (format) {
    case "pdf": {
      const { extractPdf } = await import("./file-pdf");
      return extractPdf(buffer);
    }
    case "docx": {
      const { extractDocx } = await import("./file-office");
      return extractDocx(buffer);
    }
    case "txt": {
      const { extractText } = await import("./file-text");
      return extractText(buffer);
    }
    case "csv": {
      const { extractCsv } = await import("./file-office");
      return extractCsv(buffer);
    }
    case "xlsx": {
      const { extractXlsx } = await import("./file-office");
      return extractXlsx(buffer);
    }
    default:
      throw new Error(`Unsupported file format: ${format}`);
  }
}

function resolveFormat(mimeType: string, filename: string): string {
  const mimeMap: Record<string, string> = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
    "text/csv": "csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-excel": "xlsx",
  };
  if (mimeMap[mimeType]) return mimeMap[mimeType];
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext && SUPPORTED_FILE_EXTENSIONS[ext]) return SUPPORTED_FILE_EXTENSIONS[ext];
  throw new Error(`Cannot resolve format for MIME "${mimeType}" / extension ".${ext ?? "?"}"`);
}
