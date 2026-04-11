/**
 * Splits LLM output into the user-facing prompt body vs follow-up questions.
 *
 * We instruct models to append `[GENIUS_QUESTIONS]` on its own line after the
 * prompt. Using `indexOf("[GENIUS_QUESTIONS]")` caused false positives when the
 * model echoed that literal inside the prompt body, truncating the display.
 */

const MARKER = '[GENIUS_QUESTIONS]';

/** Newline(s), optional spaces, then the marker — real trailer from system prompt. */
const LINE_BOUNDARY = /\r?\n[ \t]*\[GENIUS_QUESTIONS\]/g;

function lastLineBoundaryMatch(text: string): { index: number; fullMatch: string } | null {
  LINE_BOUNDARY.lastIndex = 0;
  let last: { index: number; fullMatch: string } | null = null;
  let m: RegExpExecArray | null;
  while ((m = LINE_BOUNDARY.exec(text)) !== null) {
    last = { index: m.index, fullMatch: m[0] };
  }
  return last;
}

function firstLineBoundaryMatch(text: string): { index: number; fullMatch: string } | null {
  LINE_BOUNDARY.lastIndex = 0;
  const m = LINE_BOUNDARY.exec(text);
  return m ? { index: m.index, fullMatch: m[0] } : null;
}

/**
 * During streaming: hide everything from the first real delimiter onward.
 */
export function stripGeniusQuestionsForDisplay(raw: string): string {
  const hit = firstLineBoundaryMatch(raw);
  if (!hit) return raw;
  return raw.slice(0, hit.index);
}

/**
 * After stream end: split body vs JSON questions part (after marker).
 * Falls back to legacy `lastIndexOf(MARKER)` only when the marker sits at
 * line start (BOF or after newline) so mid-body echoes do not split.
 */
export function splitCompletionAndQuestions(raw: string): {
  body: string;
  questionsPart: string;
} {
  const last = lastLineBoundaryMatch(raw);
  if (last) {
    return {
      body: raw.slice(0, last.index).trimEnd(),
      questionsPart: raw.slice(last.index + last.fullMatch.length),
    };
  }

  const legacy = raw.lastIndexOf(MARKER);
  if (legacy === -1) {
    return { body: raw, questionsPart: '' };
  }

  const atLineStart =
    legacy === 0 || raw[legacy - 1] === '\n' || (legacy >= 2 && raw.slice(legacy - 2, legacy) === '\r\n');
  if (!atLineStart) {
    return { body: raw, questionsPart: '' };
  }

  return {
    body: raw.slice(0, legacy).trimEnd(),
    questionsPart: raw.slice(legacy + MARKER.length),
  };
}
