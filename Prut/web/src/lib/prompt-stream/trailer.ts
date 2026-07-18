/**
 * The prompt-trailer contract — the single home for the in-band block the LLM
 * appends after the enhanced prompt:
 *
 *   <enhanced prompt body>
 *   [PROMPT_TITLE]…[/PROMPT_TITLE]
 *   [GENIUS_QUESTIONS][json array]
 *
 * Both the PRODUCER side (the five engines, which instruct the model to emit
 * this trailer) and the CONSUMER side (streaming display, finalize/parse, JSON
 * validation, questions endpoint) import from here so the markers and the
 * split/strip/parse rules live in exactly one place.
 *
 * The hardest half is the `[GENIUS_QUESTIONS]` split: a naive
 * `indexOf("[GENIUS_QUESTIONS]")` caused false positives when the model echoed
 * that literal inside the prompt body, truncating the display. The split is
 * therefore anchored to a line boundary (newline + optional indent + marker),
 * with a legacy fallback that only fires when the marker sits at line start.
 */

import type { Question } from "@/lib/types";

export const TRAILER = {
  TITLE_OPEN: "[PROMPT_TITLE]",
  TITLE_CLOSE: "[/PROMPT_TITLE]",
  QUESTIONS: "[GENIUS_QUESTIONS]",
} as const;

export interface PromptTrailer {
  title: string | null;
  questions: Question[];
  questionsRaw: string;
}

// ── Regex helpers, all derived from the TRAILER.* constants ──

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const Q = escapeRegExp(TRAILER.QUESTIONS);
const TITLE_OPEN = escapeRegExp(TRAILER.TITLE_OPEN);
const TITLE_CLOSE = escapeRegExp(TRAILER.TITLE_CLOSE);

/** Newline(s), optional spaces, then the marker — the real trailer boundary. */
const LINE_BOUNDARY = new RegExp(`\\r?\\n[ \\t]*${Q}`, "g");
/** Captures the title text between the open/close markers (dotall-safe). */
const TITLE_CAPTURE = new RegExp(`${TITLE_OPEN}([\\s\\S]*?)${TITLE_CLOSE}`);
/** Strips a closed title block (and a trailing newline). */
const TITLE_STRIP_CLOSED = new RegExp(`${TITLE_OPEN}[\\s\\S]*?${TITLE_CLOSE}\\n?`, "g");
/** Strips an unclosed title block that runs to end-of-string. */
const TITLE_STRIP_OPEN = new RegExp(`${TITLE_OPEN}[\\s\\S]*$`, "g");
/** Bare questions marker, for defensive body cleanup. */
const QUESTIONS_BARE = new RegExp(Q, "g");

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
 * During streaming: hide everything from the first real (line-boundary)
 * `[GENIUS_QUESTIONS]` delimiter onward — closed AND unclosed — plus the
 * `[PROMPT_TITLE]…[/PROMPT_TITLE]` block. Never splits on a mid-line echo of
 * the marker. Only HIDES: the caller keeps the canonical buffer intact.
 */
export function stripTrailerForDisplay(raw: string): string {
  let out = raw;
  const hit = firstLineBoundaryMatch(out);
  if (hit) out = out.slice(0, hit.index);
  // Strip the title block — both fully-closed and unclosed-trailing — so the
  // user never sees the marker flicker mid-stream.
  out = out.replace(TITLE_STRIP_CLOSED, "").replace(TITLE_STRIP_OPEN, "");
  return out;
}

/**
 * After stream end: split body vs the JSON questions part (after the marker).
 * Uses the LAST line-boundary marker; falls back to legacy `lastIndexOf` only
 * when the marker sits at line start (BOF or after newline) so mid-body echoes
 * do not split.
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

  const marker = TRAILER.QUESTIONS;
  const legacy = raw.lastIndexOf(marker);
  if (legacy === -1) {
    return { body: raw, questionsPart: "" };
  }

  const atLineStart =
    legacy === 0 ||
    raw[legacy - 1] === "\n" ||
    (legacy >= 2 && raw.slice(legacy - 2, legacy) === "\r\n");
  if (!atLineStart) {
    return { body: raw, questionsPart: "" };
  }

  return {
    body: raw.slice(0, legacy).trimEnd(),
    questionsPart: raw.slice(legacy + marker.length),
  };
}

/** @deprecated use {@link stripTrailerForDisplay} — kept for back-compat naming. */
export function stripGeniusQuestionsForDisplay(raw: string): string {
  const hit = firstLineBoundaryMatch(raw);
  if (!hit) return raw;
  return raw.slice(0, hit.index);
}

/**
 * Parse a questions JSON blob into normalized {@link Question}s. Handles
 * code-fence wrapping, a `{ questions: [...] }` envelope, and array-recovery
 * from malformed JSON. Non-object entries and entries without a string
 * `question` are dropped. Never throws — returns `[]` on unrecoverable input.
 */
export function parseQuestionsJson(raw: string): Question[] {
  if (!raw) return [];
  let jsonStr = raw.trim();
  if (!jsonStr) return [];

  // Strip markdown code fences (```json … ``` or ``` … ```).
  jsonStr = jsonStr
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  if (!jsonStr) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // Array-recovery: pull the first […] span and try again.
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (!arrayMatch) return [];
    try {
      parsed = JSON.parse(arrayMatch[0]);
    } catch {
      return [];
    }
  }

  let arr: unknown[];
  if (Array.isArray(parsed)) {
    arr = parsed;
  } else if (parsed !== null && typeof parsed === "object") {
    const envelope = (parsed as { questions?: unknown }).questions;
    arr = Array.isArray(envelope) ? envelope : [];
  } else {
    arr = [];
  }

  return arr
    .filter(
      (q): q is Record<string, unknown> =>
        q !== null && typeof q === "object" && typeof (q as Record<string, unknown>).question === "string",
    )
    .map((q) => ({
      id: typeof q.id === "number" ? q.id : 0,
      question: String(q.question),
      description: typeof q.description === "string" ? q.description : "",
      examples: Array.isArray(q.examples)
        ? q.examples.filter((e): e is string => typeof e === "string")
        : [],
      ...(typeof q.priority === "number" ? { priority: q.priority } : {}),
      ...(typeof q.category === "string" ? { category: q.category } : {}),
      ...(typeof q.impactEstimate === "string" ? { impactEstimate: q.impactEstimate } : {}),
      ...(typeof q.required === "boolean" ? { required: q.required } : {}),
    }));
}

/**
 * Finalize path: split off the trailer, extract + strip the title, parse +
 * normalize the questions. Returns the cleaned body plus the structured
 * {@link PromptTrailer}. The body still contains any `<thinking>` blocks —
 * that strip is not part of the trailer contract and stays with the caller.
 */
export function parseTrailer(raw: string): { body: string; trailer: PromptTrailer } {
  const { body: rawBody, questionsPart } = splitCompletionAndQuestions(raw);

  let body = rawBody;
  const titleMatch = body.match(TITLE_CAPTURE);
  const title = titleMatch ? titleMatch[1].trim() : null;
  body = body.replace(TITLE_STRIP_CLOSED, "").trim();
  // Defensive: strip any leaked bare questions marker from the body.
  body = body.replace(QUESTIONS_BARE, "").trim();

  const questions = parseQuestionsJson(questionsPart);
  return { body, trailer: { title, questions, questionsRaw: questionsPart } };
}

/**
 * Producer side — the canonical Hebrew refinement trailer instruction. Each
 * engine passes only its domain-specific `questionFocus` sentence (the "…up to
 * 3 new questions targeting X. Return [] if …" body); the fixed frame (title
 * instruction + markers + JSON format line) lives here.
 *
 * `language` is accepted for API symmetry with the i18n path; the non-Hebrew
 * override is emitted separately by `BaseEngine.buildLanguageOverride`, which
 * shares the same TRAILER.* markers, so the skeleton itself stays Hebrew.
 */
export function renderTrailerInstruction(opts: {
  questionFocus?: string;
  language?: string;
}): string {
  const focus =
    opts.questionFocus?.trim() ||
    "ועד 3 שאלות חדשות המכוונות לפערים בעלי ההשפעה הגבוהה ביותר שנותרו. החזר מערך ריק [] אם הפרומפט כעת מקיף ומלא.";

  return `לאחר הפרומפט המשופר, הוסף כותרת תיאורית קצרה בעברית:
${TRAILER.TITLE_OPEN}שם קצר ותיאורי בעברית${TRAILER.TITLE_CLOSE}

לאחר מכן הוסף ${TRAILER.QUESTIONS} ${focus}
פורמט: ${TRAILER.QUESTIONS}[{"id": 1, "question": "...", "description": "...", "examples": ["..."]}]`;
}
