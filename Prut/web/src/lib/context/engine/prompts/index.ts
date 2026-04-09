import type { DocumentType } from '../types';
import { enrichContract } from './enrich-contract';
import { enrichAcademic } from './enrich-academic';
import { enrichMarketing } from './enrich-marketing';
import { enrichData } from './enrich-data';
import { enrichCode } from './enrich-code';
import { enrichGeneric } from './enrich-generic';
import { enrichImage } from './enrich-image';

export function selectEnrichPrompt(type: DocumentType, isImage: boolean): string {
  if (isImage) return enrichImage;
  switch (type) {
    case 'חוזה משפטי':  return enrichContract;
    case 'מאמר אקדמי': return enrichAcademic;
    case 'דף שיווקי':   return enrichMarketing;
    case 'טבלת נתונים': return enrichData;
    case 'קוד מקור':    return enrichCode;
    default:             return enrichGeneric;
  }
}
