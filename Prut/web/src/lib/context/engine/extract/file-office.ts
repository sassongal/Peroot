import mammoth from "mammoth";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface OfficeExtractionResult {
  text: string;
  metadata: {
    format: "docx" | "xlsx" | "csv";
    rows?: number;
    columns?: number;
    sheets?: number;
    sheetName?: string;
    warnings?: string[];
  };
}

const MAX_CHARS = 20_000;

// docx/xlsx are ZIP archives. The 10MB upload cap bounds the *compressed* input,
// but mammoth / XLSX.read decompress unbounded into memory — a zip bomb (ratios
// up to ~1000:1) could OOM the function. Reject archives whose *decompressed*
// size (summed from the ZIP central directory, without decompressing anything)
// exceeds this.
const MAX_DECOMPRESSED_BYTES = 80 * 1024 * 1024; // 80 MB

/**
 * Sum the uncompressed sizes of every entry from a ZIP central directory,
 * reading only the small directory records (no decompression). Returns null if
 * the buffer isn't a parseable ZIP (caller then skips the check — a malformed
 * archive fails in the real parser anyway).
 */
export function zipTotalUncompressedSize(buf: Buffer): number | null {
  const EOCD_SIG = 0x06054b50;
  const CDH_SIG = 0x02014b50;
  const MIN_EOCD = 22;
  if (buf.length < MIN_EOCD) return null;
  let eocd = -1;
  const start = Math.max(0, buf.length - MIN_EOCD - 0xffff);
  for (let i = buf.length - MIN_EOCD; i >= start; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  try {
    const count = buf.readUInt16LE(eocd + 10);
    let p = buf.readUInt32LE(eocd + 16); // central-directory offset
    let total = 0;
    for (let n = 0; n < count; n++) {
      if (p + 46 > buf.length || buf.readUInt32LE(p) !== CDH_SIG) return null;
      // 0xFFFFFFFF is the zip64 sentinel — treated as ~4GB here, which trips the
      // limit anyway, so a zip64-hidden bomb is still rejected.
      total += buf.readUInt32LE(p + 24); // uncompressed size
      const nameLen = buf.readUInt16LE(p + 28);
      const extraLen = buf.readUInt16LE(p + 30);
      const commentLen = buf.readUInt16LE(p + 32);
      p += 46 + nameLen + extraLen + commentLen;
    }
    return total;
  } catch {
    return null;
  }
}

function assertArchiveWithinLimit(buffer: Buffer): void {
  const total = zipTotalUncompressedSize(buffer);
  if (total !== null && total > MAX_DECOMPRESSED_BYTES) {
    throw new Error(
      `Archive decompresses to ~${Math.round(total / 1024 / 1024)}MB, exceeds ${MAX_DECOMPRESSED_BYTES / 1024 / 1024}MB limit`,
    );
  }
}

export async function extractDocx(buffer: Buffer): Promise<OfficeExtractionResult> {
  assertArchiveWithinLimit(buffer);
  const result = await mammoth.extractRawText({ buffer });
  if (!result.value.trim()) throw new Error("DOCX is empty or unreadable");
  return {
    text: result.value,
    metadata: {
      format: "docx",
      warnings: result.messages.length ? result.messages.map((m) => m.message) : undefined,
    },
  };
}

export async function extractCsv(buffer: Buffer): Promise<OfficeExtractionResult> {
  const raw = buffer.toString("utf-8");
  const parsed = Papa.parse<Record<string, string>>(raw, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new Error(`CSV parse errors: ${parsed.errors.map((e) => e.message).join("; ")}`);
  }
  const headers = parsed.meta.fields ?? [];
  const rows = parsed.data;
  const lines: string[] = [
    `CSV with ${rows.length} rows and ${headers.length} columns`,
    `Columns: ${headers.join(", ")}`,
    "",
  ];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const pairs = headers.map((h) => `${h}: ${row[h] ?? ""}`).join(" | ");
    lines.push(`Row ${i + 1}: ${pairs}`);
    if (lines.join("\n").length > MAX_CHARS) break;
  }
  return {
    text: lines.join("\n"),
    metadata: { format: "csv", rows: rows.length, columns: headers.length },
  };
}

export async function extractXlsx(buffer: Buffer): Promise<OfficeExtractionResult> {
  assertArchiveWithinLimit(buffer);
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellFormula: false,
    cellHTML: false,
    cellStyles: false,
  });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) throw new Error("XLSX contains no sheets");
  const sheet = workbook.Sheets[firstSheet];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (jsonData.length === 0) {
    return {
      text: "(empty spreadsheet)",
      metadata: {
        format: "xlsx",
        rows: 0,
        sheets: workbook.SheetNames.length,
        sheetName: firstSheet,
      },
    };
  }
  const headers = Object.keys(jsonData[0]);
  const lines: string[] = [
    `Spreadsheet "${firstSheet}" with ${jsonData.length} rows and ${headers.length} columns`,
    `Columns: ${headers.join(", ")}`,
    "",
  ];
  for (let i = 0; i < jsonData.length; i++) {
    const pairs = headers.map((h) => `${h}: ${String(jsonData[i][h] ?? "")}`).join(" | ");
    lines.push(`Row ${i + 1}: ${pairs}`);
    if (lines.join("\n").length > MAX_CHARS) break;
  }
  return {
    text: lines.join("\n"),
    metadata: {
      format: "xlsx",
      rows: jsonData.length,
      columns: headers.length,
      sheets: workbook.SheetNames.length,
      sheetName: firstSheet,
    },
  };
}
