/**
 * Shared types for the context extraction system.
 *
 * These types define the shape of context attachments (files, URLs, images)
 * that are extracted, tokenized, and bundled into prompts.
 */

import type { ContextBlock, ProcessingStage } from "./engine/types";

export type AttachmentType = "file" | "url" | "image";

export type AttachmentStatus = "loading" | "ready" | "error";

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

  // -- Error --
  error?: string;

  // -- Context Engine (new shape) --
  /** NEW — populated from API response when routes return {block} */
  block?: ContextBlock;
  /** NEW — drives the progress bar in the attachment card */
  stage?: ProcessingStage;
}

