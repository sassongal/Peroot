/**
 * Extraction surface re-exports.
 *
 * Heavy file/URL extractors (jsdom, mammoth, xlsx, pdfjs-dist) live in
 * sibling Workers — see ../extract/remote.ts. This module no longer
 * imports them, so OpenNext's bundler keeps them out of the main script.
 */
export const MAX_FILE_SIZE_MB = 10;

export const SUPPORTED_FILE_EXTENSIONS: Record<string, string> = {
  pdf: "pdf",
  docx: "docx",
  txt: "txt",
  csv: "csv",
  xlsx: "xlsx",
  xls: "xlsx",
};

export { extractImage } from "./image";
