/**
 * Server-side utility for extracting text from uploaded files.
 *
 * Supports: PDF, DOCX, TXT, CSV, XLSX
 *
 * This module is intended for use in API routes and server actions only.
 * It relies on Node.js APIs (Buffer) and is not safe for client bundles.
 */

import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { trimToTokenLimit, MAX_TOKENS_PER_ATTACHMENT } from './token-counter';
import type { ExtractionResult } from './types';

/** Maximum file size in megabytes */
export const MAX_FILE_SIZE_MB = 10;

/** Maximum character length for extracted text (~5000 tokens) */
const MAX_CHARS = 20_000;

/** Supported MIME types mapped to their format label */
export const SUPPORTED_FILE_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
};

/**
 * Extract readable text content from a file buffer.
 *
 * @param buffer   - Raw file bytes
 * @param filename - Original filename (used for format detection fallback)
 * @param mimeType - MIME type of the file
 * @returns Extracted text and metadata
 * @throws Error if the file format is unsupported or extraction fails
 */
export async function extractTextFromFile(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ExtractionResult> {
  const sizeMb = buffer.length / (1024 * 1024);

  if (sizeMb > MAX_FILE_SIZE_MB) {
    throw new Error(
      `File size ${sizeMb.toFixed(1)} MB exceeds maximum of ${MAX_FILE_SIZE_MB} MB`
    );
  }

  // Resolve format from MIME type or fall back to file extension
  const format = resolveFormat(mimeType, filename);

  switch (format) {
    case 'pdf':
      return extractPdf(buffer, sizeMb);
    case 'docx':
      return extractDocx(buffer, sizeMb);
    case 'txt':
      return extractTxt(buffer, sizeMb);
    case 'csv':
      return extractCsv(buffer, sizeMb);
    case 'xlsx':
    case 'xls':
      return extractXlsx(buffer, sizeMb);
    default:
      throw new Error(
        `Unsupported file format "${format}". Supported formats: ${Object.values(SUPPORTED_FILE_TYPES).join(', ')}`
      );
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function resolveFormat(mimeType: string, filename: string): string {
  // Try MIME type first
  if (SUPPORTED_FILE_TYPES[mimeType]) {
    return SUPPORTED_FILE_TYPES[mimeType];
  }

  // Fall back to file extension
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext && Object.values(SUPPORTED_FILE_TYPES).includes(ext)) {
    return ext;
  }

  throw new Error(
    `Unsupported file type: MIME "${mimeType}", extension ".${ext ?? 'unknown'}". ` +
    `Supported: ${Object.values(SUPPORTED_FILE_TYPES).join(', ')}`
  );
}

function trimText(text: string): { text: string; trimmed: boolean } {
  return trimToTokenLimit(text, MAX_TOKENS_PER_ATTACHMENT);
}

// -- PDF --

async function extractPdf(buffer: Buffer, sizeMb: number): Promise<ExtractionResult> {
  let parser: PDFParse | undefined;
  try {
    parser = new PDFParse({ data: new Uint8Array(buffer) });
    const textResult = await Promise.race([
      parser.getText(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PDF extraction timed out after 10s')), 10_000)
      ),
    ]);

    const { text: trimmedText } = trimText(textResult.text);

    return {
      text: trimmedText,
      metadata: {
        pages: textResult.total,
        size_mb: Math.round(sizeMb * 100) / 100,
        format: 'pdf',
      },
    };
  } catch (err) {
    throw new Error(
      `Failed to extract text from PDF: ${err instanceof Error ? err.message : String(err)}`
    );
  } finally {
    if (parser) {
      await parser.destroy().catch(() => {});
    }
  }
}

// -- DOCX --

async function extractDocx(buffer: Buffer, sizeMb: number): Promise<ExtractionResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const { text: trimmedText } = trimText(result.value);

    return {
      text: trimmedText,
      metadata: {
        size_mb: Math.round(sizeMb * 100) / 100,
        format: 'docx',
        warnings: result.messages.length > 0 ? result.messages.map((m) => m.message) : undefined,
      },
    };
  } catch (err) {
    throw new Error(
      `Failed to extract text from DOCX: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

// -- TXT --

async function extractTxt(buffer: Buffer, sizeMb: number): Promise<ExtractionResult> {
  const raw = buffer.toString('utf-8');
  const { text: trimmedText } = trimText(raw);

  return {
    text: trimmedText,
    metadata: {
      size_mb: Math.round(sizeMb * 100) / 100,
      format: 'txt',
      characters: raw.length,
    },
  };
}

// -- CSV --

async function extractCsv(buffer: Buffer, sizeMb: number): Promise<ExtractionResult> {
  try {
    const raw = buffer.toString('utf-8');
    const parsed = Papa.parse<Record<string, string>>(raw, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      throw new Error(`CSV parse errors: ${parsed.errors.map((e) => e.message).join('; ')}`);
    }

    const headers = parsed.meta.fields ?? [];
    const rows = parsed.data;

    // Format as readable text: each row becomes "header: value" pairs
    const lines: string[] = [];
    lines.push(`CSV with ${rows.length} rows and ${headers.length} columns`);
    lines.push(`Columns: ${headers.join(', ')}`);
    lines.push('');

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const pairs = headers.map((h) => `${h}: ${row[h] ?? ''}`).join(' | ');
      lines.push(`Row ${i + 1}: ${pairs}`);

      // Early exit if we are already beyond character limit
      if (lines.join('\n').length > MAX_CHARS) break;
    }

    const { text: trimmedText } = trimText(lines.join('\n'));

    return {
      text: trimmedText,
      metadata: {
        rows: rows.length,
        columns: headers.length,
        size_mb: Math.round(sizeMb * 100) / 100,
        format: 'csv',
      },
    };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('CSV parse errors')) throw err;
    throw new Error(
      `Failed to extract text from CSV: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

// -- XLSX --

async function extractXlsx(buffer: Buffer, sizeMb: number): Promise<ExtractionResult> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new Error('XLSX file contains no sheets');
    }

    const sheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    });

    if (jsonData.length === 0) {
      return {
        text: '(empty spreadsheet)',
        metadata: {
          rows: 0,
          sheets: workbook.SheetNames.length,
          size_mb: Math.round(sizeMb * 100) / 100,
          format: 'xlsx',
        },
      };
    }

    const headers = Object.keys(jsonData[0]);
    const lines: string[] = [];
    lines.push(
      `Spreadsheet "${firstSheetName}" with ${jsonData.length} rows and ${headers.length} columns`
    );
    lines.push(`Columns: ${headers.join(', ')}`);
    lines.push('');

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const pairs = headers.map((h) => `${h}: ${String(row[h] ?? '')}`).join(' | ');
      lines.push(`Row ${i + 1}: ${pairs}`);

      if (lines.join('\n').length > MAX_CHARS) break;
    }

    const { text: trimmedText } = trimText(lines.join('\n'));

    return {
      text: trimmedText,
      metadata: {
        rows: jsonData.length,
        columns: headers.length,
        sheets: workbook.SheetNames.length,
        sheet_name: firstSheetName,
        size_mb: Math.round(sizeMb * 100) / 100,
        format: 'xlsx',
      },
    };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('XLSX file')) throw err;
    throw new Error(
      `Failed to extract text from XLSX: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
