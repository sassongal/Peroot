/**
 * Shared types for the context extraction system.
 *
 * These types define the shape of context attachments (files, URLs, images)
 * that are extracted, tokenized, and bundled into prompts.
 */

export type AttachmentType = 'file' | 'url' | 'image';

export type AttachmentStatus = 'loading' | 'ready' | 'error';

export interface ContextAttachment {
  /** Unique identifier for this attachment */
  id: string;

  /** Source type */
  type: AttachmentType;

  /** Display name */
  name: string;

  /** Processing status */
  status: AttachmentStatus;

  // -- File-specific fields --
  filename?: string;
  format?: string;
  size_mb?: number;

  // -- URL-specific fields --
  url?: string;

  // -- Extracted content --
  extractedText?: string;
  /** Alias kept for extraction pipeline compatibility */
  extracted_text?: string;
  /** Human-readable description (used for images) */
  description?: string;
  metadata?: Record<string, unknown>;
  /** Estimated token count of extracted text */
  tokenCount?: number;
  /** Alias kept for extraction pipeline compatibility */
  tokens?: number;

  // -- Error --
  error?: string;
}

export interface ContextPayload {
  type: AttachmentType;
  name: string;
  content: string;
  tokenCount: number;
  format?: string;
  filename?: string;
  url?: string;
  extracted_text?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface ExtractionResult {
  text: string;
  metadata: Record<string, unknown>;
}
