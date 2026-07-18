import type { DocumentType } from "../types";
import { DOCUMENT_CAPABILITY } from "../capability";
import { enrichImage } from "./enrich-image";

/** Images always use the vision enrich prompt; otherwise the type's table entry. */
export function selectEnrichPrompt(type: DocumentType, isImage: boolean): string {
  if (isImage) return enrichImage;
  return DOCUMENT_CAPABILITY[type].enrichPrompt;
}
