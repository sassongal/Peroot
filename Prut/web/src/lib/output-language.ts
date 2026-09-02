import type { VoiceLang } from "@/hooks/useVoiceRecorder";

/**
 * Output language: the one table (master plan, languages spec B1-B2).
 *
 * Until now the output language rode on the voice-recognition picker, deep in
 * the tools drawer, labelled with country flags. In 90 days, 0 of 313
 * enhancements were in anything but Hebrew. This module owns the languages
 * themselves, their native names (no flags: a flag is a country, and Arabic
 * is not Saudi Arabia), their writing direction, and script detection so the
 * product can suggest the language from what the user is typing.
 */
export type OutputLanguage = "hebrew" | "english" | "arabic" | "russian";

export interface OutputLanguageDef {
  code: OutputLanguage;
  /** The language's own name for itself. Never a flag. */
  native: string;
  /** Short Hebrew label for the picker tooltip. */
  he: string;
  dir: "rtl" | "ltr";
  /** Speech-recognition locale to use when the INPUT is in this language. */
  voice: VoiceLang;
  /** BCP-47 tag for `lang` attributes. */
  tag: string;
}

export const OUTPUT_LANGUAGES: readonly OutputLanguageDef[] = [
  { code: "hebrew", native: "עברית", he: "עברית", dir: "rtl", voice: "he-IL", tag: "he" },
  { code: "english", native: "English", he: "אנגלית", dir: "ltr", voice: "en-US", tag: "en" },
  { code: "arabic", native: "العربية", he: "ערבית", dir: "rtl", voice: "ar-SA", tag: "ar" },
  { code: "russian", native: "Русский", he: "רוסית", dir: "ltr", voice: "ru-RU", tag: "ru" },
] as const;

const BY_CODE = new Map(OUTPUT_LANGUAGES.map((l) => [l.code, l]));

export function outputLanguageDef(code: OutputLanguage): OutputLanguageDef {
  return BY_CODE.get(code) ?? OUTPUT_LANGUAGES[0];
}

export function isOutputLanguage(value: unknown): value is OutputLanguage {
  return typeof value === "string" && BY_CODE.has(value as OutputLanguage);
}

/** The key under which a visitor's preference is kept before they sign in. */
export const OUTPUT_LANGUAGE_STORAGE_KEY = "peroot_output_language";

// Letter ranges per script. Digits, punctuation and whitespace are ignored so
// a Hebrew prompt full of numbers and URLs still counts as Hebrew.
const HEBREW = /[֐-׿]/g;
const ARABIC = /[؀-ۿݐ-ݿ]/g;
const CYRILLIC = /[Ѐ-ӿ]/g;
const LATIN = /[A-Za-z]/g;

function count(text: string, re: RegExp): number {
  return (text.match(re) ?? []).length;
}

export interface ScriptDetection {
  language: OutputLanguage | null;
  /** Share of letters belonging to the winning script, 0..1. */
  confidence: number;
  letters: number;
}

/**
 * Which language the text is written in, judged by its letters.
 *
 * Mixed input is the norm here: Hebrew prompts routinely carry English
 * product names, model names and code identifiers. So Latin only wins when it
 * clearly dominates, while a Hebrew, Arabic or Cyrillic majority wins at the
 * plain threshold. Below `minLetters` nothing is decided: three characters
 * are not a language.
 */
export function detectScriptLanguage(text: string, minLetters = 12): ScriptDetection {
  // A pasted URL is Latin letters with no language in them.
  text = text.replace(/(?:https?:\/\/|www\.)\S+/gi, " ");
  const he = count(text, HEBREW);
  const ar = count(text, ARABIC);
  const cy = count(text, CYRILLIC);
  const la = count(text, LATIN);
  const letters = he + ar + cy + la;
  if (letters < minLetters) return { language: null, confidence: 0, letters };

  const shares: [OutputLanguage, number][] = [
    ["hebrew", he / letters],
    ["arabic", ar / letters],
    ["russian", cy / letters],
    ["english", la / letters],
  ];
  shares.sort((a, b) => b[1] - a[1]);
  const [language, confidence] = shares[0];

  // English must be unambiguous, because "כתוב פוסט על ChatGPT ו-Notion" is
  // Hebrew with English words in it, not an English prompt.
  const threshold = language === "english" ? 0.8 : 0.6;
  if (confidence < threshold) return { language: null, confidence, letters };
  return { language, confidence, letters };
}

/**
 * Does a generated text actually use the requested language's script?
 *
 * Used after generation. The instruction to the model is only an instruction;
 * this is the check. Returns the share of letters in the expected script.
 */
export function scriptMatchShare(text: string, language: OutputLanguage): number {
  const letters =
    count(text, HEBREW) + count(text, ARABIC) + count(text, CYRILLIC) + count(text, LATIN);
  if (letters === 0) return 1;
  const own =
    language === "hebrew"
      ? count(text, HEBREW)
      : language === "arabic"
        ? count(text, ARABIC)
        : language === "russian"
          ? count(text, CYRILLIC)
          : count(text, LATIN);
  return own / letters;
}

/** Below this share the output is in the wrong language, whatever it says. */
export const SCRIPT_MATCH_MIN = 0.7;
