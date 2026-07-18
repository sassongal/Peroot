/**
 * One table for everything a DocumentType "does" — how it's compressed, which
 * enrich prompt it uses, which expert role it maps to, and its role-selection
 * priority. Collapses four previously-scattered switches (getCompressionStrategy,
 * selectEnrichPrompt, DOCUMENT_TYPE_TO_ROLE, PRIORITY) into a single row per type.
 *
 * Because it's a `Record<DocumentType, …>`, adding or changing a DocumentType is
 * one edit and the compiler forces every field — no more silent drift like the
 * one that left "מסמך משפטי"/"דוח כספי" without a role.
 */
import type { DocumentType } from "./types";
import type { CompressionStrategy } from "./compress";
import { enrichContract } from "./prompts/enrich-contract";
import { enrichLegal } from "./prompts/enrich-legal";
import { enrichFinancial } from "./prompts/enrich-financial";
import { enrichAcademic } from "./prompts/enrich-academic";
import { enrichMarketing } from "./prompts/enrich-marketing";
import { enrichData } from "./prompts/enrich-data";
import { enrichCode } from "./prompts/enrich-code";
import { enrichGeneric } from "./prompts/enrich-generic";
import { enrichEmail } from "./prompts/enrich-email";
import { enrichWebpage } from "./prompts/enrich-webpage";

export interface ExpertRole {
  role: string;
  tone: string;
  focusAreas: string[];
}

export interface DocumentCapability {
  compression: CompressionStrategy;
  /** Non-image enrich prompt for this type. Images use enrichImage regardless (see selectEnrichPrompt). */
  enrichPrompt: string;
  role: ExpertRole;
  /** Role-selection priority (lower wins); null = never wins, falls back to the generic role. */
  priority: number | null;
}

const GENERIC_ROLE: ExpertRole = {
  role: "מומחה תוכן רב-תחומי",
  tone: "ניטרלי, מאוזן",
  focusAreas: ["העיקר", "פרטים רלוונטיים", "חסרים אפשריים"],
};

export const DOCUMENT_CAPABILITY: Record<DocumentType, DocumentCapability> = {
  "חוזה משפטי": {
    compression: "contract",
    enrichPrompt: enrichContract,
    role: {
      role: "יועץ משפטי בכיר",
      tone: "פורמלי, זהיר, מדויק",
      focusAreas: ["סעיפי סיכון", "חובות וזכויות", "תנאי סיום"],
    },
    priority: 1,
  },
  // NOTE: role is currently the generic role (historical drift — these two types
  // were missing from the old role map). Preserved to keep behavior identical;
  // upgrading them to dedicated legal/financial roles is a separate product decision.
  "מסמך משפטי": {
    compression: "contract",
    enrichPrompt: enrichLegal,
    role: GENERIC_ROLE,
    priority: null,
  },
  "דוח כספי": {
    compression: "default",
    enrichPrompt: enrichFinancial,
    role: GENERIC_ROLE,
    priority: null,
  },
  "מאמר אקדמי": {
    compression: "academic",
    enrichPrompt: enrichAcademic,
    role: {
      role: "חוקר בתחום התוכן",
      tone: "ניתוחי, מתודי, מבוסס ראיות",
      focusAreas: ["תזה מרכזית", "ממצאים", "מגבלות מתודולוגיות"],
    },
    priority: 3,
  },
  "דף שיווקי": {
    compression: "default",
    enrichPrompt: enrichMarketing,
    role: {
      role: "מומחה פרפורמנס מרקטינג",
      tone: "משכנע, ממוקד תועלת",
      focusAreas: ["Value proposition", "Call to action", "Objection handling"],
    },
    priority: 5,
  },
  "טבלת נתונים": {
    compression: "data",
    enrichPrompt: enrichData,
    role: {
      role: "אנליסט נתונים",
      tone: "כמותי, מדויק, מובנה",
      focusAreas: ["מגמות", "חריגים", "מדדי מפתח"],
    },
    priority: 4,
  },
  "קוד מקור": {
    compression: "code",
    enrichPrompt: enrichCode,
    role: {
      role: "מהנדס תוכנה בכיר",
      tone: "טכני, מדויק",
      focusAreas: ["ארכיטקטורה", "באגים פוטנציאליים", "ביצועים"],
    },
    priority: 2,
  },
  "אימייל/התכתבות": {
    compression: "default",
    enrichPrompt: enrichEmail,
    role: {
      role: "מומחה תקשורת עסקית",
      tone: "ממוקד, מכבד",
      focusAreas: ["הקשר", "אינטרס הדובר", "צעד הבא"],
    },
    priority: 6,
  },
  "דף אינטרנט": {
    compression: "default",
    enrichPrompt: enrichWebpage,
    role: {
      role: "content strategist",
      tone: "מובנה, שימושי",
      focusAreas: ["מסר מרכזי", "קהל יעד", "דגשים"],
    },
    priority: 7,
  },
  תמונה: {
    compression: "default",
    enrichPrompt: enrichGeneric,
    role: {
      role: "מומחה ויזואל ו-UX",
      tone: "תיאורי, מדויק",
      focusAreas: ["הרכב", "צבעים", "טקסט חזותי"],
    },
    priority: 8,
  },
  generic: {
    compression: "default",
    enrichPrompt: enrichGeneric,
    role: GENERIC_ROLE,
    priority: null,
  },
};
