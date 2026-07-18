/**
 * Bounded-memory primitives for the extract seam.
 *
 * Every extract adapter that materializes bytes from an untrusted source MUST
 * bound its memory through this module — one place to audit and tune the caps.
 * (Before this existed, each adapter bounded memory ad-hoc, which left gaps: a
 * URL body was fully buffered before its size was checked, and zip-based office
 * files decompressed unbounded. See the find-bugs recon that motivated PR #21.)
 */

export const MAX_FILE_SIZE_MB = 10;
export const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB — HTTP response body cap
export const MAX_DECOMPRESSED_BYTES = 80 * 1024 * 1024; // 80 MB — zip decompressed cap

/** A user-facing error whose message may be shown to the caller verbatim. */
export function userFacingError(message: string): Error {
  const err = new Error(message) as Error & { userFacing: boolean };
  err.userFacing = true;
  return err;
}

/**
 * Read a Response body into a string, aborting the moment `maxBytes` is
 * exceeded. Streams chunk-by-chunk so a server that omits or lies about
 * content-length cannot OOM us by sending an unbounded body.
 */
export async function readCapped(
  res: Response,
  maxBytes: number = MAX_RESPONSE_BYTES,
): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) {
    const buf = await res.arrayBuffer();
    if (buf.byteLength > maxBytes) throw userFacingError("התוכן גדול מדי לעיבוד");
    return new TextDecoder().decode(buf);
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        throw userFacingError("התוכן גדול מדי לעיבוד");
      }
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return new TextDecoder().decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));
}

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

/** Reject a zip-based file (docx/xlsx) whose decompressed size would blow the cap. */
export function assertArchiveWithinLimit(buffer: Buffer): void {
  const total = zipTotalUncompressedSize(buffer);
  if (total !== null && total > MAX_DECOMPRESSED_BYTES) {
    throw new Error(
      `Archive decompresses to ~${Math.round(total / 1024 / 1024)}MB, exceeds ${MAX_DECOMPRESSED_BYTES / 1024 / 1024}MB limit`,
    );
  }
}
