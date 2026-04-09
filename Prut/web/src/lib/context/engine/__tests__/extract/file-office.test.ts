import { describe, it, expect } from 'vitest';
import { extractCsv, extractXlsx, extractDocx } from '../../extract/file-office';

describe('extractCsv', () => {
  it('formats headers and rows as readable text', async () => {
    const csv = 'name,age\nAlice,30\nBob,25\n';
    const r = await extractCsv(Buffer.from(csv));
    expect(r.text).toContain('Columns: name, age');
    expect(r.text).toContain('Row 1');
    expect(r.metadata.rows).toBe(2);
    expect(r.metadata.columns).toBe(2);
  });
});

describe('extractXlsx', () => {
  it('handles basic input', async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['h1', 'h2'], ['a', 'b']]), 'Sheet1');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const r = await extractXlsx(buf);
    expect(r.text).toContain('h1');
    expect(r.metadata.rows).toBe(1);
  });
});

describe('extractDocx', () => {
  it('rejects clearly with empty buffer', async () => {
    await expect(extractDocx(Buffer.from(''))).rejects.toThrow();
  });
});
