import mammoth from 'mammoth';
import Papa from 'papaparse';
// xlsx (SheetJS): server-only; untrusted spreadsheets are parsed only after upload
// limits in the extract pipeline. npm audit may report issues with no upstream fix — monitor releases.
import * as XLSX from 'xlsx';

export interface OfficeExtractionResult {
  text: string;
  metadata: {
    format: 'docx' | 'xlsx' | 'csv';
    rows?: number;
    columns?: number;
    sheets?: number;
    sheetName?: string;
    warnings?: string[];
  };
}

const MAX_CHARS = 20_000;

export async function extractDocx(buffer: Buffer): Promise<OfficeExtractionResult> {
  const result = await mammoth.extractRawText({ buffer });
  if (!result.value.trim()) throw new Error('DOCX is empty or unreadable');
  return {
    text: result.value,
    metadata: {
      format: 'docx',
      warnings: result.messages.length ? result.messages.map((m) => m.message) : undefined,
    },
  };
}

export async function extractCsv(buffer: Buffer): Promise<OfficeExtractionResult> {
  const raw = buffer.toString('utf-8');
  const parsed = Papa.parse<Record<string, string>>(raw, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new Error(`CSV parse errors: ${parsed.errors.map((e) => e.message).join('; ')}`);
  }
  const headers = parsed.meta.fields ?? [];
  const rows = parsed.data;
  const lines: string[] = [
    `CSV with ${rows.length} rows and ${headers.length} columns`,
    `Columns: ${headers.join(', ')}`,
    '',
  ];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const pairs = headers.map((h) => `${h}: ${row[h] ?? ''}`).join(' | ');
    lines.push(`Row ${i + 1}: ${pairs}`);
    if (lines.join('\n').length > MAX_CHARS) break;
  }
  return {
    text: lines.join('\n'),
    metadata: { format: 'csv', rows: rows.length, columns: headers.length },
  };
}

export async function extractXlsx(buffer: Buffer): Promise<OfficeExtractionResult> {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellFormula: false, cellHTML: false, cellStyles: false });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) throw new Error('XLSX contains no sheets');
  const sheet = workbook.Sheets[firstSheet];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (jsonData.length === 0) {
    return {
      text: '(empty spreadsheet)',
      metadata: { format: 'xlsx', rows: 0, sheets: workbook.SheetNames.length, sheetName: firstSheet },
    };
  }
  const headers = Object.keys(jsonData[0]);
  const lines: string[] = [
    `Spreadsheet "${firstSheet}" with ${jsonData.length} rows and ${headers.length} columns`,
    `Columns: ${headers.join(', ')}`,
    '',
  ];
  for (let i = 0; i < jsonData.length; i++) {
    const pairs = headers.map((h) => `${h}: ${String(jsonData[i][h] ?? '')}`).join(' | ');
    lines.push(`Row ${i + 1}: ${pairs}`);
    if (lines.join('\n').length > MAX_CHARS) break;
  }
  return {
    text: lines.join('\n'),
    metadata: {
      format: 'xlsx',
      rows: jsonData.length,
      columns: headers.length,
      sheets: workbook.SheetNames.length,
      sheetName: firstSheet,
    },
  };
}
