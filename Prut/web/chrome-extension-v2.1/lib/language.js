/**
 * Peroot Extension — Output language (mirrors src/lib/output-language.ts).
 *
 * Four output languages, the same codes the web app and /api/enhance use.
 * "auto" is an extension-side preference: detect the script of the input
 * and ask for that language. Hebrew is the server default, so it is sent
 * only when the user chose it explicitly (keeps the payload identical to
 * the web app's).
 *
 * Dual export: `self.PerootLanguage` for extension pages and content
 * scripts, CommonJS for vitest.
 */
(function (root) {
  const OUTPUT_LANGUAGES = [
    { code: "hebrew", native: "עברית", he: "עברית", short: "עב", dir: "rtl" },
    { code: "english", native: "English", he: "אנגלית", short: "EN", dir: "ltr" },
    { code: "arabic", native: "العربية", he: "ערבית", short: "ع", dir: "rtl" },
    { code: "russian", native: "Русский", he: "רוסית", short: "RU", dir: "ltr" },
  ];
  const CODES = OUTPUT_LANGUAGES.map((l) => l.code);

  // Letter ranges per script; digits, punctuation and whitespace are ignored
  // so a Hebrew prompt full of numbers and URLs still counts as Hebrew.
  const HEBREW = /[֐-׿]/g;
  const ARABIC = /[؀-ۿݐ-ݿ]/g;
  const CYRILLIC = /[Ѐ-ӿ]/g;
  const LATIN = /[A-Za-z]/g;

  function count(text, re) {
    const m = text.match(re);
    return m ? m.length : 0;
  }

  function isOutputLanguage(v) {
    return typeof v === "string" && CODES.includes(v);
  }

  function languageDef(code) {
    return OUTPUT_LANGUAGES.find((l) => l.code === code) || OUTPUT_LANGUAGES[0];
  }

  /**
   * Which language is this text written in? Returns null when there are too
   * few letters to say, or when no script clearly dominates. English needs
   * an 80% share because "כתוב פוסט על ChatGPT ו-Notion" is Hebrew with
   * English words in it, not an English prompt.
   */
  function detectScriptLanguage(text, minLetters = 12) {
    const clean = String(text || "").replace(/(?:https?:\/\/|www\.)\S+/gi, " ");
    const he = count(clean, HEBREW);
    const ar = count(clean, ARABIC);
    const cy = count(clean, CYRILLIC);
    const la = count(clean, LATIN);
    const letters = he + ar + cy + la;
    if (letters < minLetters) return { language: null, confidence: 0, letters };
    const shares = [
      ["hebrew", he / letters],
      ["arabic", ar / letters],
      ["russian", cy / letters],
      ["english", la / letters],
    ].sort((a, b) => b[1] - a[1]);
    const [language, confidence] = shares[0];
    const threshold = language === "english" ? 0.8 : 0.6;
    if (confidence < threshold) return { language: null, confidence, letters };
    return { language, confidence, letters };
  }

  /**
   * The `output_language` value to send, or null to leave the server default
   * (Hebrew). `pref` is the stored preference: a language code or "auto".
   */
  function resolveOutputLanguage(pref, inputText) {
    if (pref === "auto") {
      const d = detectScriptLanguage(inputText || "");
      return d.language && d.language !== "hebrew" ? d.language : null;
    }
    if (isOutputLanguage(pref) && pref !== "hebrew") return pref;
    return null;
  }

  /** The direction a text should be laid out in, for result boxes. */
  function textDirection(text) {
    const d = detectScriptLanguage(text, 4);
    if (!d.language) return "auto";
    return languageDef(d.language).dir;
  }

  const api = {
    OUTPUT_LANGUAGES,
    isOutputLanguage,
    languageDef,
    detectScriptLanguage,
    resolveOutputLanguage,
    textDirection,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PerootLanguage = api;
})(typeof self !== "undefined" ? self : this);
