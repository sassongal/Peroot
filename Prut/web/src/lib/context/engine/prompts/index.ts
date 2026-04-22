import type { DocumentType } from "../types";
import { enrichContract } from "./enrich-contract";
import { enrichLegal } from "./enrich-legal";
import { enrichFinancial } from "./enrich-financial";
import { enrichAcademic } from "./enrich-academic";
import { enrichMarketing } from "./enrich-marketing";
import { enrichData } from "./enrich-data";
import { enrichCode } from "./enrich-code";
import { enrichGeneric } from "./enrich-generic";
import { enrichImage } from "./enrich-image";
import { enrichEmail } from "./enrich-email";
import { enrichWebpage } from "./enrich-webpage";

export function selectEnrichPrompt(type: DocumentType, isImage: boolean): string {
  if (isImage) return enrichImage;
  switch (type) {
    case "חוזה משפטי":
      return enrichContract;
    case "מסמך משפטי":
      return enrichLegal;
    case "דוח כספי":
      return enrichFinancial;
    case "מאמר אקדמי":
      return enrichAcademic;
    case "דף שיווקי":
      return enrichMarketing;
    case "טבלת נתונים":
      return enrichData;
    case "קוד מקור":
      return enrichCode;
    case "אימייל/התכתבות":
      return enrichEmail;
    case "דף אינטרנט":
      return enrichWebpage;
    default:
      return enrichGeneric;
  }
}
