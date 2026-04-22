import { createHash } from "node:crypto";
import type { DocumentType } from "./types";

export function computeSha256(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

interface TypeSignal {
  type: DocumentType;
  keywords: RegExp[];
  minHits: number;
}

const SIGNALS: TypeSignal[] = [
  {
    type: "דוח כספי",
    keywords: [
      /הכנסות|revenue/i,
      /רווח\s+נקי|net\s+income|EBITDA/i,
      /דוח\s+(כספי|רבעוני|שנתי)|financial\s+(report|statement)/i,
      /מאזן|balance\s+sheet/i,
      /תזרים\s+מזומנים|cash\s+flow/i,
    ],
    minHits: 3,
  },
  {
    type: "מסמך משפטי",
    keywords: [
      /פסיקה|judgment|verdict/i,
      /תביעה|lawsuit|complaint/i,
      /כתב\s+אישום|indictment/i,
      /בית\s+משפט|court|tribunal/i,
      /עורך\s+דין|attorney|counsel/i,
      /תצהיר|affidavit/i,
    ],
    minHits: 3,
  },
  {
    type: "חוזה משפטי",
    keywords: [/הסכם|חוזה/i, /צדדים|הצדדים/i, /סעיף\s*\d/, /כפוף\s+לחוק|התחייבות|סודיות/i],
    minHits: 3,
  },
  {
    type: "מאמר אקדמי",
    keywords: [
      /תקציר|abstract/i,
      /מתודולוגיה|methodology/i,
      /ביבליוגרפיה|references/i,
      /מסקנות|conclusion/i,
      /ממצאים|findings/i,
    ],
    minHits: 3,
  },
  {
    type: "דף שיווקי",
    keywords: [
      /קנה עכשיו|buy now/i,
      /הצעה|offer|discount/i,
      /הירשם|sign up|register/i,
      /call to action|cta/i,
      /מוצר|product/i,
    ],
    minHits: 3,
  },
  {
    type: "טבלת נתונים",
    keywords: [/CSV|Spreadsheet|Columns:/i, /\d+\s*rows?/i, /\d+\s*columns?/i],
    minHits: 2,
  },
  {
    type: "קוד מקור",
    keywords: [/\bfunction\b|\bclass\b|\bimport\b|\bexport\b/, /=>|;\s*$/m, /\{[\s\S]*\}/],
    minHits: 3,
  },
  {
    type: "אימייל/התכתבות",
    keywords: [/מאת:|from:/i, /אל:|to:/i, /נושא:|subject:/i, /בברכה|regards|sincerely/i],
    minHits: 3,
  },
];

/**
 * Detect document type from extracted text and source metadata.
 * Priority: explicit type (image) > keyword signals > generic.
 */
export function detectDocumentType(
  text: string,
  sourceName: string,
  sourceType: "file" | "url" | "image",
): DocumentType {
  if (sourceType === "image") return "תמונה";

  for (const signal of SIGNALS) {
    if (countHits(text, signal.keywords) >= signal.minHits) {
      return signal.type;
    }
  }

  if (sourceType === "url") return "דף אינטרנט";
  return "generic";
}

function countHits(text: string, patterns: RegExp[]): number {
  return patterns.reduce((n, p) => (p.test(text) ? n + 1 : n), 0);
}
