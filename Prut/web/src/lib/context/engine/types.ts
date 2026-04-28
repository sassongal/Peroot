/**
 * Core types for the Context Engine pipeline.
 *
 * A ContextBlock is the unit produced by processAttachment() and consumed
 * by BaseEngine.generate(). It carries two representations:
 *   - display: what the user sees in the attachment card drawer
 *   - injected: what is concatenated into the engine's system prompt
 */

export type ProcessingStage =
  | "uploading"
  | "extracting"
  | "enriching"
  | "ready"
  | "warning"
  | "error";

export type DocumentType =
  | "חוזה משפטי"
  | "מסמך משפטי"
  | "דוח כספי"
  | "מאמר אקדמי"
  | "דף שיווקי"
  | "טבלת נתונים"
  | "קוד מקור"
  | "אימייל/התכתבות"
  | "דף אינטרנט"
  | "תמונה"
  | "generic";

export type EntityType = "person" | "org" | "date" | "amount" | "location" | "other";

export interface ContextEntity {
  name: string;
  type: EntityType;
}

export interface ContextBlockMetadata {
  pages?: number;
  author?: string;
  publishedTime?: string;
  rows?: number;
  columns?: number;
  colors?: string[];
  truncated?: boolean;
  originalTokenCount?: number;
  sourceUrl?: string;
  filename?: string;
  mimeType?: string;
  sizeMb?: number;
}

export interface ContextBlockDisplay {
  title: string;
  documentType: DocumentType;
  summary: string;
  keyFacts: string[];
  entities: ContextEntity[];
  rawText?: string; // stripped from Redis-cached blocks; always present on fresh pipeline output
  metadata: ContextBlockMetadata;
}

export interface ContextBlockInjected {
  header: string;
  body: string;
  tokenCount: number;
}

export interface PipelineError {
  stage: "extract" | "enrich" | "compress" | "structure" | "inject";
  message: string;
  retryable: boolean;
}

export interface ContextBlock {
  id: string;
  type: "file" | "url" | "image";
  sha256: string;
  display: ContextBlockDisplay;
  injected: ContextBlockInjected;
  stage: ProcessingStage;
  error?: PipelineError;
  /** Raw base64 image data for visual passthrough to vision-capable models.
   *  Present only on fresh (non-cached) image blocks. Stripped before Redis write. */
  imageBase64?: string;
  imageMimeType?: string;
}

export type PlanTier = "free" | "pro";

export interface ProcessAttachmentInput {
  id: string;
  type: "file" | "url" | "image";
  userId: string;
  tier: PlanTier;
  // file inputs
  buffer?: Buffer;
  filename?: string;
  mimeType?: string;
  // url input
  url?: string;
  // optional progress callback for SSE streaming
  onStage?: (stage: ProcessingStage) => void;
}
