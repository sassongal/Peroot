/**
 * Peroot Extension — Prompt text helpers (mirrors src/lib/prompt-stream/trailer.ts
 * and src/lib/text/dashes.ts).
 *
 * The enhance stream carries an in-band trailer after the prompt body:
 *   <body>
 *   [PROMPT_TITLE]...[/PROMPT_TITLE]
 *   [GENIUS_QUESTIONS][json array]
 * plus, for some engines, an <internal_quality_check> block the model uses to
 * review itself. Everything the user sees goes through `cleanForDisplay`;
 * the questions come out of `parseGeniusQuestions`. One implementation for
 * the popup, the chat injector and the selection panel.
 */
(function (root) {
  const TITLE_OPEN = "[PROMPT_TITLE]";
  const TITLE_CLOSE = "[/PROMPT_TITLE]";
  const QUESTIONS = "[GENIUS_QUESTIONS]";

  function esc(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  const LINE_BOUNDARY = new RegExp(`\\r?\\n[ \\t]*${esc(QUESTIONS)}`, "g");
  const TITLE_CAPTURE = new RegExp(`${esc(TITLE_OPEN)}([\\s\\S]*?)${esc(TITLE_CLOSE)}`);
  const TITLE_STRIP_CLOSED = new RegExp(`${esc(TITLE_OPEN)}[\\s\\S]*?${esc(TITLE_CLOSE)}\\n?`, "g");
  const TITLE_STRIP_OPEN = new RegExp(`${esc(TITLE_OPEN)}[\\s\\S]*$`);
  const QUALITY_CHECK = /<internal_quality_check[\s\S]*?(?:<\/internal_quality_check>|$)/g;

  const META_PREFIXES = [
    /^here'?s?\s+(?:your|the|a)\s+.*?prompt.*?:?\s*\n?/i,
    /^i'?ve\s+(?:created|crafted|generated).*?:?\s*\n?/i,
    /^below\s+is.*?:?\s*\n?/i,
    /^the\s+following\s+.*?prompt.*?:?\s*\n?/i,
    /^כתוב את הפרומפט הבא:?\s*\n?/,
    /^הנה הפרומפט.*?:?\s*\n?/,
    /^פרומפט מוכן.*?:?\s*\n?/,
  ];

  function firstBoundary(text) {
    LINE_BOUNDARY.lastIndex = 0;
    const m = LINE_BOUNDARY.exec(text);
    return m ? m.index : -1;
  }

  /** The body only: no trailer, no title block, no self-review block. */
  function stripTrailer(raw) {
    let out = String(raw || "");
    const i = firstBoundary(out);
    if (i >= 0) out = out.slice(0, i);
    else if (out.startsWith(QUESTIONS)) out = "";
    out = out.replace(TITLE_STRIP_CLOSED, "").replace(TITLE_STRIP_OPEN, "");
    out = out.replace(QUALITY_CHECK, "");
    return out;
  }

  /**
   * Long dashes never reach a reader (project rule). The server scrubs its
   * own stream; this covers text that arrives from a cache or an older route.
   */
  function stripAiDashes(text) {
    return String(text || "")
      .replace(/\s*[–—]\s*/g, (m) => (m.includes("\n") ? "\n" : ", "))
      .replace(/, ,/g, ",")
      .replace(/\s+,/g, ",");
  }

  /** What the user sees: body, trimmed, without model chatter or long dashes. */
  function cleanForDisplay(raw, opts = {}) {
    let body = stripTrailer(raw);
    if (opts.json) return extractJSONObject(body);
    for (const re of META_PREFIXES) body = body.replace(re, "");
    return stripAiDashes(body).trim();
  }

  function parseTitle(raw) {
    const m = String(raw || "").match(TITLE_CAPTURE);
    return m ? m[1].trim() || null : null;
  }

  function parseGeniusQuestions(raw) {
    const text = String(raw || "");
    const i = firstBoundary(text);
    const start = i >= 0 ? text.indexOf(QUESTIONS, i) : text.startsWith(QUESTIONS) ? 0 : -1;
    if (start < 0) return [];
    const json = text.slice(start + QUESTIONS.length).trim();
    if (!json || json === "[]") return [];
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed.filter((q) => q && typeof q.question === "string") : [];
    } catch {
      return [];
    }
  }

  /** First balanced JSON object in a text (image engines answer in JSON). */
  function extractJSONObject(raw) {
    const t = String(raw || "").trim();
    const first = t.indexOf("{");
    if (first === -1) return t;
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = first; i < t.length; i++) {
      const ch = t[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === "{") depth++;
      else if (ch === "}" && --depth === 0) return t.slice(first, i + 1);
    }
    return t.slice(first);
  }

  const api = {
    TRAILER: { TITLE_OPEN, TITLE_CLOSE, QUESTIONS },
    stripTrailer,
    stripAiDashes,
    cleanForDisplay,
    parseTitle,
    parseGeniusQuestions,
    extractJSONObject,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PerootPromptText = api;
})(typeof self !== "undefined" ? self : this);
