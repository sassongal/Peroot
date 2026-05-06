/**
 * peroot-extract-file Worker
 *
 * Sibling Worker bound to main `peroot` via Service Binding `EXTRACT_FILE`.
 * Holds heavy parsing deps (mammoth, xlsx, pdfjs-dist, papaparse) so the main
 * Worker stays under the 10 MiB Workers Paid script-size limit.
 *
 * Auth: requests must carry `X-Internal-Secret` matching env.EXTRACT_SECRET.
 *
 * Wire format: multipart/form-data with fields
 *   - file:   the binary blob
 *   - format: "docx" | "xlsx" | "csv" | "pdf"
 */
import { extractDocx, extractCsv, extractXlsx } from "./file-office";
import { extractPdf } from "./file-pdf";

interface Env {
  EXTRACT_SECRET: string;
}

type Format = "docx" | "xlsx" | "csv" | "pdf";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }

    const secret = request.headers.get("x-internal-secret");
    if (!env.EXTRACT_SECRET || secret !== env.EXTRACT_SECRET) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return json({ ok: false, error: "Invalid multipart body" }, 400);
    }

    const file = form.get("file");
    const format = form.get("format");

    if (!(file instanceof Blob)) {
      return json({ ok: false, error: "Missing file" }, 400);
    }
    if (typeof format !== "string" || !isFormat(format)) {
      return json({ ok: false, error: "Missing or invalid format" }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
      let result;
      switch (format) {
        case "docx":
          result = await extractDocx(buffer);
          break;
        case "xlsx":
          result = await extractXlsx(buffer);
          break;
        case "csv":
          result = await extractCsv(buffer);
          break;
        case "pdf":
          result = await extractPdf(buffer);
          break;
      }
      return json({ ok: true, result }, 200);
    } catch (err) {
      const e = err as Error;
      return json({ ok: false, error: e.message || "Extraction failed" }, 500);
    }
  },
};

function isFormat(v: string): v is Format {
  return v === "docx" || v === "xlsx" || v === "csv" || v === "pdf";
}

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
