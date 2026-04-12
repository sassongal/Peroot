/**
 * Coverage Analyzer — identifies which parts of a prompt contribute to scoring
 * dimensions and which parts are "dead weight" (uncovered text).
 *
 * Works by chunking the prompt into logical segments (lines/bullets/sections)
 * and evaluating each chunk against the dimension detectors. O(n × d) where
 * n = number of chunks and d = number of active dimensions (~10).
 *
 * Does NOT duplicate the regex from input-scorer — instead it scores each
 * chunk independently and maps the result back.
 */
import { CapabilityMode } from '@/lib/capability-mode';
import { scoreInput, type InputScore } from './input-scorer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CoverageChunk {
  /** Start index in original text */
  start: number;
  /** End index in original text */
  end: number;
  /** The chunk text */
  text: string;
  /** Dimensions this chunk contributes to (from breakdown) */
  dimensions: string[];
  /** Whether this chunk is covered by any dimension */
  covered: boolean;
}

interface CoverageResult {
  /** All detected chunks */
  chunks: CoverageChunk[];
  /** Coverage ratio: covered chunks / total chunks (0-1) */
  coverageRatio: number;
  /** Number of uncovered chunks */
  uncoveredCount: number;
  /** Total chunks analyzed */
  totalChunks: number;
  /** The full score (same as scoreInput) */
  score: InputScore;
  /** Human-readable tip when coverage is low */
  tip: string | null;
}

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------

/** Split text into logical chunks: lines, bullets, or sentences. */
function chunkText(text: string): Array<{ start: number; end: number; text: string }> {
  const chunks: Array<{ start: number; end: number; text: string }> = [];
  // Split by newline or bullet markers
  const re = /[^\n]+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const line = match[0].trim();
    if (line.length < 3) continue; // skip empty/trivial lines
    chunks.push({
      start: match.index,
      end: match.index + match[0].length,
      text: line,
    });
  }
  // If single-line prompt, split by sentence markers
  if (chunks.length <= 1 && text.length > 30) {
    const sentenceRe = /[^.!?;,،。]+[.!?;,،。]?/g;
    const sentences: Array<{ start: number; end: number; text: string }> = [];
    while ((match = sentenceRe.exec(text)) !== null) {
      const sent = match[0].trim();
      if (sent.length < 5) continue;
      sentences.push({
        start: match.index,
        end: match.index + match[0].length,
        text: sent,
      });
    }
    if (sentences.length > 1) return sentences;
  }
  return chunks.length > 0 ? chunks : [{ start: 0, end: text.length, text }];
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

/**
 * Analyze coverage: which chunks of the prompt contribute to which dimensions.
 *
 * Performance: O(chunks × dimensions). For a 10K-char prompt this is ~50 chunk
 * evaluations × 10 dims = 500 regex tests — well under 50ms on any device.
 */
export function analyzeCoverage(text: string, mode: CapabilityMode): CoverageResult {
  const trimmed = text.trim();
  if (!trimmed) {
    const emptyScore = scoreInput('', mode);
    return {
      chunks: [],
      coverageRatio: 0,
      uncoveredCount: 0,
      totalChunks: 0,
      score: emptyScore,
      tip: null,
    };
  }

  // Get the full score for context
  const fullScore = scoreInput(trimmed, mode);

  // Chunk the text
  const rawChunks = chunkText(trimmed);

  // Subtractive dimensions score high by default (start at 1.0, deduct for
  // problems). Exclude them from coverage — they don't indicate the chunk
  // "contributes" anything; they just aren't penalized.
  const SUBTRACTIVE_DIMS = new Set(['clarity', 'enforceability']);

  // For each chunk, score it independently and see which dimensions it triggers
  const coverageChunks: CoverageChunk[] = rawChunks.map((chunk) => {
    const chunkScore = scoreInput(chunk.text, mode);
    // Only additive dimensions where the chunk actively matches something
    const dims = chunkScore.breakdown
      .filter((d) => d.score > 0 && !SUBTRACTIVE_DIMS.has(d.key))
      .map((d) => d.key);
    return {
      start: chunk.start,
      end: chunk.end,
      text: chunk.text,
      dimensions: dims,
      covered: dims.length > 0,
    };
  });

  const uncoveredCount = coverageChunks.filter((c) => !c.covered).length;
  const totalChunks = coverageChunks.length;
  const coverageRatio = totalChunks > 0 ? (totalChunks - uncoveredCount) / totalChunks : 0;

  let tip: string | null = null;
  if (coverageRatio < 0.5 && totalChunks >= 3) {
    tip = 'חלק ניכר מהטקסט לא תורם לציון. הוסף כותרות או תוויות (תפקיד:, מטרה:, פורמט:) כדי שהמערכת תזהה את המבנה.';
  } else if (coverageRatio < 0.7 && totalChunks >= 2) {
    tip = 'חלק מהטקסט לא מזוהה כתורם לממדים. נסה לפרק לסעיפים עם תוויות ברורות.';
  }

  return {
    chunks: coverageChunks,
    coverageRatio,
    uncoveredCount,
    totalChunks,
    score: fullScore,
    tip,
  };
}
