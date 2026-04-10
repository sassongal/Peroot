/**
 * Context Engine public API.
 */
import { randomUUID } from 'node:crypto';
import { getContextLimits } from '@/lib/plans';
import { logger } from '@/lib/logger';
import type {
  ContextBlock,
  ProcessAttachmentInput,
  PipelineError,
  DocumentType,
} from './types';
import { dispatchFile, extractUrl, extractImage } from './extract';
import { computeSha256, detectDocumentType } from './classify';
import { enrichContent } from './enrich';
import { compressToLimit } from './compress';
import { buildInjectedBlock, renderInjection } from './inject';
import { getCachedBlock, putCachedBlock } from './cache';

export { renderInjection } from './inject';
export { selectEngineModel } from '@/lib/ai/context-router';
export type { ContextBlock, ProcessAttachmentInput } from './types';

export async function processAttachment(input: ProcessAttachmentInput): Promise<ContextBlock> {
  const limits = getContextLimits(input.tier);
  const id = input.id || randomUUID();

  // 1. EXTRACT
  let rawText = '';
  let sourceTitle = input.filename ?? input.url ?? 'attachment';
  let extractMeta: Record<string, unknown> = {};
  let imageBase64: string | undefined;
  let imageMimeType: string | undefined;

  try {
    if (input.type === 'file') {
      if (!input.buffer || !input.filename || !input.mimeType) {
        throw new Error('file input requires buffer, filename, mimeType');
      }
      const r = await dispatchFile(input.buffer, input.filename, input.mimeType);
      rawText = r.text;
      extractMeta = r.metadata;
      sourceTitle = input.filename;
    } else if (input.type === 'url') {
      if (!input.url) throw new Error('url input requires url');
      const r = await extractUrl(input.url, { jinaFallback: limits.jinaFallback });
      rawText = r.text;
      extractMeta = r.metadata;
      sourceTitle = (r.metadata.title as string | undefined) ?? input.url;
    } else if (input.type === 'image') {
      if (!input.buffer || !input.mimeType) {
        throw new Error('image input requires buffer, mimeType');
      }
      const r = await extractImage(input.buffer, input.mimeType);
      imageBase64 = r.base64;
      imageMimeType = r.metadata.mimeType ?? input.mimeType;
      extractMeta = r.metadata;
      sourceTitle = input.filename ?? 'image';
      rawText = '';
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : undefined;
    logger.error('[context-engine] extraction failed', { type: input.type, tier: input.tier, errMsg, errStack });
    return failedBlock(id, input, 'extract', err);
  }

  // 2. CLASSIFY + CACHE KEY
  const sha256 = computeSha256(
    input.type === 'image' ? (input.buffer as Buffer) : rawText || sourceTitle,
  );
  const cached = await getCachedBlock(sha256, input.tier);
  if (cached) {
    logger.info('[context-engine] cache hit', { sha256, tier: input.tier });
    return { ...cached, id };
  }
  const detectedType: DocumentType = detectDocumentType(rawText, sourceTitle, input.type);

  // 3. ENRICH
  let enriched;
  try {
    enriched = await enrichContent({
      text: rawText,
      detectedType,
      sourceType: input.type,
      title: sourceTitle,
      imageBase64,
      imageMimeType,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : undefined;
    logger.error('[context-engine] enrich failed', { type: input.type, tier: input.tier, errMsg, errStack });
    return warningBlock(id, input, sha256, rawText, sourceTitle, detectedType, extractMeta, err);
  }

  // For images, rawText is empty — use the enrichment summary as content
  if (input.type === 'image' && !rawText && enriched.summary) {
    rawText = enriched.summary;
  }

  // 4. COMPRESS
  const compressed = compressToLimit(rawText, limits.perAttachment);

  // 5. STRUCTURE
  const block: ContextBlock = {
    id,
    type: input.type,
    sha256,
    stage: 'ready',
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
    injected: { header: '', body: '', tokenCount: 0 },
  };
  block.injected = buildInjectedBlock(block, 1);

  // 6. CACHE
  await putCachedBlock(block, input.tier);
  return block;
}

export async function processBatch(
  inputs: ProcessAttachmentInput[],
): Promise<ContextBlock[]> {
  return Promise.all(inputs.map(processAttachment));
}

function failedBlock(
  id: string,
  input: ProcessAttachmentInput,
  stage: PipelineError['stage'],
  err: unknown,
): ContextBlock {
  const message = err instanceof Error ? err.message : String(err);
  return {
    id,
    type: input.type,
    sha256: '',
    stage: 'error',
    error: { stage, message, retryable: true },
    display: {
      title: input.filename ?? input.url ?? 'attachment',
      documentType: 'generic',
      summary: '',
      keyFacts: [],
      entities: [],
      rawText: '',
      metadata: { filename: input.filename, sourceUrl: input.url },
    },
    injected: { header: '', body: '', tokenCount: 0 },
  };
}

function warningBlock(
  id: string,
  input: ProcessAttachmentInput,
  sha256: string,
  rawText: string,
  title: string,
  detectedType: DocumentType,
  extractMeta: Record<string, unknown>,
  err: unknown,
): ContextBlock {
  const message = err instanceof Error ? err.message : String(err);
  const block: ContextBlock = {
    id,
    type: input.type,
    sha256,
    stage: 'warning',
    error: { stage: 'enrich', message, retryable: true },
    display: {
      title,
      documentType: detectedType,
      summary: rawText.slice(0, 400),
      keyFacts: [],
      entities: [],
      rawText,
      metadata: { ...extractMeta, filename: input.filename, sourceUrl: input.url },
    },
    injected: { header: '', body: '', tokenCount: 0 },
  };
  block.injected = buildInjectedBlock(block, 1);
  return block;
}
