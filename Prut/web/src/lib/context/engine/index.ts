/**
 * Context Engine public API.
 */
import { randomUUID } from "node:crypto";
import { getContextLimits } from "@/lib/plans";
import { logger } from "@/lib/logger";
import type { ContextBlock, ProcessAttachmentInput, PipelineError, DocumentType } from "./types";
import { extract, type ExtractInput, type ExtractMetadata } from "./extract";
import { computeSha256, detectDocumentType } from "./classify";
import { enrichContent } from "./enrich";
import { compressToLimit, type CompressionStrategy } from "./compress";
import { buildInjectedBlock, renderInjection } from "./inject";
import { getCachedBlock, putCachedBlock } from "./cache";

export { renderInjection } from "./inject";
export { selectEngineModel } from "@/lib/ai/context-router";
export type { ContextBlock, ProcessAttachmentInput } from "./types";

function getCompressionStrategy(detectedType: DocumentType): CompressionStrategy {
  switch (detectedType) {
    case "קוד מקור":
      return "code";
    case "טבלת נתונים":
      return "data";
    case "חוזה משפטי":
    case "מסמך משפטי":
      return "contract";
    case "מאמר אקדמי":
      return "academic";
    default:
      return "default";
  }
}

/** Map the wide ProcessAttachmentInput to the discriminated ExtractInput,
 *  validating that each source kind carries the fields it needs (the failures
 *  land in failedBlock via the extract try/catch). */
function toExtractInput(input: ProcessAttachmentInput, jinaFallback: boolean): ExtractInput {
  if (input.type === "url") {
    if (!input.url) throw new Error("url input requires url");
    return { kind: "url", url: input.url, jinaFallback };
  }
  if (input.type === "image") {
    if (!input.buffer || !input.mimeType) throw new Error("image input requires buffer, mimeType");
    return { kind: "image", buffer: input.buffer, mimeType: input.mimeType };
  }
  if (!input.buffer || !input.filename || !input.mimeType) {
    throw new Error("file input requires buffer, filename, mimeType");
  }
  return { kind: "file", buffer: input.buffer, filename: input.filename, mimeType: input.mimeType };
}

export async function processAttachment(input: ProcessAttachmentInput): Promise<ContextBlock> {
  const limits = getContextLimits(input.tier);
  const id = input.id || randomUUID();
  const { onStage } = input;

  // 1. EXTRACT
  onStage?.("extracting");
  let rawText = "";
  let sourceTitle = input.filename ?? input.url ?? "attachment";
  let extractMeta: Partial<ExtractMetadata> = {};
  let imageBase64: string | undefined;
  let imageMimeType: string | undefined;

  try {
    const r = await extract(toExtractInput(input, limits.jinaFallback));
    rawText = r.text;
    extractMeta = r.metadata;
    imageBase64 = r.imageBase64;
    imageMimeType = r.imageMimeType;
    sourceTitle =
      input.type === "url"
        ? ((r.metadata.title as string | undefined) ?? input.url ?? "attachment")
        : input.type === "image"
          ? (input.filename ?? "image")
          : (input.filename ?? "attachment");
  } catch (err) {
    return failedBlock(id, input, "extract", err);
  }

  // 2. CLASSIFY + CACHE KEY
  const sha256 = computeSha256(
    input.type === "image" ? (input.buffer as Buffer) : rawText || sourceTitle,
  );
  const cached = await getCachedBlock(sha256, input.tier, input.type, input.userId);
  if (cached) {
    logger.info("[context-engine] cache hit", { sha256, tier: input.tier });
    return { ...cached, id };
  }
  const detectedType: DocumentType = detectDocumentType(rawText, sourceTitle, input.type);

  // 3. COMPRESS (before enrich so warning blocks also get bounded text)
  const strategy = getCompressionStrategy(detectedType);
  const compressed = compressToLimit(rawText, limits.perAttachment, strategy);

  // 4. ENRICH
  onStage?.("enriching");
  let enriched;
  try {
    enriched = await enrichContent({
      text: compressed.text,
      detectedType,
      sourceType: input.type,
      title: sourceTitle,
      imageBase64,
      imageMimeType,
      tier: input.tier,
    });
  } catch (err) {
    logger.warn("[context-engine] enrich failed — returning warning block", err);
    const wb = warningBlock(
      id,
      input,
      sha256,
      compressed.text,
      sourceTitle,
      detectedType,
      extractMeta,
      err,
    );
    // Cache warning blocks with short TTL — transient failures should retry sooner
    await putCachedBlock(wb, input.tier, input.userId);
    return wb;
  }

  // 5. STRUCTURE
  const block: ContextBlock = {
    id,
    type: input.type,
    sha256,
    stage: "ready",
    display: {
      title: enriched.title,
      documentType: enriched.documentType,
      summary: enriched.summary,
      keyFacts: enriched.keyFacts,
      entities: enriched.entities,
      rawText: compressed.text,
      metadata: {
        ...extractMeta,
        truncated: compressed.truncated,
        originalTokenCount: compressed.originalTokenCount,
        filename: input.filename,
        sourceUrl: input.url,
        mimeType: input.mimeType,
      },
    },
    injected: { header: "", body: "", tokenCount: 0 },
  };
  block.injected = buildInjectedBlock(block, 1);

  // Populate image passthrough fields (not written to Redis cache)
  if (input.type === "image" && imageBase64 && imageBase64.length <= 1_400_000) {
    block.imageBase64 = imageBase64;
    block.imageMimeType = imageMimeType;
  }

  // 6. CACHE
  const { imageBase64: _b64, imageMimeType: _mime, ...blockForCache } = block;
  await putCachedBlock(blockForCache as ContextBlock, input.tier, input.userId);
  onStage?.("ready");
  return block;
}

function failedBlock(
  id: string,
  input: ProcessAttachmentInput,
  stage: PipelineError["stage"],
  err: unknown,
): ContextBlock {
  const message = err instanceof Error ? err.message : String(err);
  return {
    id,
    type: input.type,
    sha256: "",
    stage: "error",
    error: { stage, message, retryable: true },
    display: {
      title: input.filename ?? input.url ?? "attachment",
      documentType: "generic",
      summary: "",
      keyFacts: [],
      entities: [],
      rawText: "",
      metadata: { filename: input.filename, sourceUrl: input.url },
    },
    injected: { header: "", body: "", tokenCount: 0 },
  };
}

function warningBlock(
  id: string,
  input: ProcessAttachmentInput,
  sha256: string,
  rawText: string,
  title: string,
  detectedType: DocumentType,
  extractMeta: Partial<ExtractMetadata>,
  err: unknown,
): ContextBlock {
  const message = err instanceof Error ? err.message : String(err);
  const block: ContextBlock = {
    id,
    type: input.type,
    sha256,
    stage: "warning",
    error: { stage: "enrich", message, retryable: true },
    display: {
      title,
      documentType: detectedType,
      // Images have no rawText — use a placeholder so the injection block isn't empty.
      summary: rawText
        ? rawText.slice(0, 400)
        : input.type === "image"
          ? "[תמונה — הניתוח האוטומטי לא הצליח; התמונה לא זמינה כטקסט]"
          : "",
      keyFacts: [],
      entities: [],
      rawText,
      metadata: { ...extractMeta, filename: input.filename, sourceUrl: input.url },
    },
    injected: { header: "", body: "", tokenCount: 0 },
  };
  block.injected = buildInjectedBlock(block, 1);
  return block;
}
