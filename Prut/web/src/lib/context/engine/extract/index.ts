/**
 * Lazy-loaded extractors — heavy packages (pdfjs-dist, mammoth, xlsx, jsdom)
 * are only imported when their specific extractor is invoked. This prevents
 * cold-start crashes on Vercel where importing all packages eagerly can
 * exceed bundle/memory limits or fail to resolve native bindings.
 */
import { extractImage } from './image';

export const MAX_FILE_SIZE_MB = 10;

const SUPPORTED_FILE_EXTENSIONS: Record<string, string> = {
  pdf: 'pdf',
  docx: 'docx',
  txt: 'txt',
  csv: 'csv',
  xlsx: 'xlsx',
  xls: 'xlsx',
};

interface FileDispatchResult {
  text: string;
  metadata: Record<string, unknown> & { format: string };
}

/**
 * Route a file buffer to the right extractor based on MIME type + filename.
 * Each extractor is dynamically imported to keep cold-start lightweight.
 */
export async function dispatchFile(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<FileDispatchResult> {
  const sizeMb = buffer.length / (1024 * 1024);
  if (sizeMb > MAX_FILE_SIZE_MB) {
    throw new Error(`File size ${sizeMb.toFixed(1)}MB exceeds ${MAX_FILE_SIZE_MB}`);
  }
  const format = resolveFormat(mimeType, filename);
  switch (format) {
    case 'pdf': {
      const { extractPdf } = await import('./file-pdf');
      return extractPdf(buffer);
    }
    case 'docx': {
      const { extractDocx } = await import('./file-office');
      return extractDocx(buffer);
    }
    case 'txt': {
      const { extractText } = await import('./file-text');
      return extractText(buffer);
    }
    case 'csv': {
      const { extractCsv } = await import('./file-office');
      return extractCsv(buffer);
    }
    case 'xlsx': {
      const { extractXlsx } = await import('./file-office');
      return extractXlsx(buffer);
    }
    default:
      throw new Error(`Unsupported file format: ${format}`);
  }
}

function resolveFormat(mimeType: string, filename: string): string {
  const mimeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-excel': 'xlsx',
  };
  if (mimeMap[mimeType]) return mimeMap[mimeType];
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext && SUPPORTED_FILE_EXTENSIONS[ext]) return SUPPORTED_FILE_EXTENSIONS[ext];
  throw new Error(`Cannot resolve format for MIME "${mimeType}" / extension ".${ext ?? '?'}"`);
}

export async function extractUrl(
  ...args: Parameters<typeof import('./url').extractUrl>
): Promise<Awaited<ReturnType<typeof import('./url').extractUrl>>> {
  const { extractUrl: impl } = await import('./url');
  return impl(...args);
}

export { extractImage };
