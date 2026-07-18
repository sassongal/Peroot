import { describe, expect, it } from "vitest";
import {
  TRAILER,
  parseQuestionsJson,
  parseTrailer,
  renderTrailerInstruction,
  splitCompletionAndQuestions,
  stripGeniusQuestionsForDisplay,
  stripTrailerForDisplay,
} from "./trailer";

// ── stripTrailerForDisplay (streaming display path) ──

describe("stripTrailerForDisplay", () => {
  it("hides from the first newline-boundary marker", () => {
    const raw = 'Hello world\n[GENIUS_QUESTIONS][{"id":1}]';
    expect(stripTrailerForDisplay(raw)).toBe("Hello world");
  });

  it("does not strip when the marker appears mid-line (false positive)", () => {
    const raw = "Use [GENIUS_QUESTIONS] format for JSON";
    expect(stripTrailerForDisplay(raw)).toBe(raw);
  });

  it("regression: a mid-line echo followed by a real trailer only splits at the trailer", () => {
    const raw =
      'Use the [GENIUS_QUESTIONS] token as a delimiter in your body.\n[GENIUS_QUESTIONS][{"id":1}]';
    expect(stripTrailerForDisplay(raw)).toBe(
      "Use the [GENIUS_QUESTIONS] token as a delimiter in your body.",
    );
  });

  it("strips a closed title block", () => {
    const raw = "Body text\n[PROMPT_TITLE]My Title[/PROMPT_TITLE]";
    expect(stripTrailerForDisplay(raw).trim()).toBe("Body text");
  });

  it("hides an unclosed trailing title (streaming mid-emit)", () => {
    const raw = "Body text\n[PROMPT_TITLE]My Tit";
    expect(stripTrailerForDisplay(raw).trim()).toBe("Body text");
  });

  it("hides both title and questions when both are present", () => {
    const raw =
      'Body\n[PROMPT_TITLE]T[/PROMPT_TITLE]\n[GENIUS_QUESTIONS][{"id":1,"question":"q"}]';
    expect(stripTrailerForDisplay(raw).trim()).toBe("Body");
  });
});

// ── splitCompletionAndQuestions (inherited behaviour) ──

describe("splitCompletionAndQuestions", () => {
  it("splits on the last newline-boundary marker", () => {
    const raw = 'Prompt line one\nPrompt two\n[GENIUS_QUESTIONS][{"id":1,"question":"q"}]';
    const { body, questionsPart } = splitCompletionAndQuestions(raw);
    expect(body).toBe("Prompt line one\nPrompt two");
    expect(questionsPart.trim().startsWith("[")).toBe(true);
  });

  it("does not split when only a mid-body marker exists", () => {
    const raw = "Mid [GENIUS_QUESTIONS] echo without newline before marker";
    const { body, questionsPart } = splitCompletionAndQuestions(raw);
    expect(body).toBe(raw);
    expect(questionsPart).toBe("");
  });

  it("legacy: a BOF marker still splits", () => {
    const raw = "[GENIUS_QUESTIONS][]";
    const { body, questionsPart } = splitCompletionAndQuestions(raw);
    expect(body).toBe("");
    expect(questionsPart.trim()).toBe("[]");
  });

  it("stripGeniusQuestionsForDisplay back-compat name still works", () => {
    const raw = "Hello\n[GENIUS_QUESTIONS][]";
    expect(stripGeniusQuestionsForDisplay(raw)).toBe("Hello");
  });
});

// ── parseTrailer (finalize path) ──

describe("parseTrailer", () => {
  it("extracts a closed title and strips it from the body", () => {
    const raw = "The enhanced prompt.\n[PROMPT_TITLE]Great Prompt[/PROMPT_TITLE]";
    const { body, trailer } = parseTrailer(raw);
    expect(body).toBe("The enhanced prompt.");
    expect(trailer.title).toBe("Great Prompt");
  });

  it("returns null title when absent", () => {
    const { trailer } = parseTrailer("Just a body with no trailer");
    expect(trailer.title).toBeNull();
    expect(trailer.questions).toEqual([]);
  });

  it("splits body from questions and parses them", () => {
    const raw =
      'Body line\n[PROMPT_TITLE]T[/PROMPT_TITLE]\n[GENIUS_QUESTIONS][{"id":1,"question":"מי הקהל?","description":"","examples":[]}]';
    const { body, trailer } = parseTrailer(raw);
    expect(body).toBe("Body line");
    expect(trailer.title).toBe("T");
    expect(trailer.questions).toHaveLength(1);
    expect(trailer.questions[0].question).toBe("מי הקהל?");
  });

  it("recovers questions from code-fence-wrapped JSON", () => {
    const raw =
      'Body\n[GENIUS_QUESTIONS]```json\n[{"id":2,"question":"q2"}]\n```';
    const { trailer } = parseTrailer(raw);
    expect(trailer.questions).toHaveLength(1);
    expect(trailer.questions[0].id).toBe(2);
  });

  it("recovers questions from malformed JSON surrounded by prose (array recovery)", () => {
    const raw =
      'Body\n[GENIUS_QUESTIONS] here you go: [{"id":3,"question":"q3"}] thanks';
    const { trailer } = parseTrailer(raw);
    expect(trailer.questions).toHaveLength(1);
    expect(trailer.questions[0].id).toBe(3);
  });

  it("handles an empty [] questions array", () => {
    const raw = "Body\n[GENIUS_QUESTIONS][]";
    const { body, trailer } = parseTrailer(raw);
    expect(body).toBe("Body");
    expect(trailer.questions).toEqual([]);
  });

  it("leaves an unclosed body title untouched (finalize strips only closed blocks)", () => {
    // Finalize path matches the original behaviour: only a CLOSED title block is
    // extracted/stripped. Hiding an unclosed trailing title is a display concern
    // (stripTrailerForDisplay), not a finalize concern.
    const raw = "Body\n[PROMPT_TITLE]Unclosed title runs on";
    const { body, trailer } = parseTrailer(raw);
    expect(body).toContain("Body");
    expect(trailer.title).toBeNull();
  });

  it("JSON-mode: parseTrailer(imageJson + trailer).body round-trips to valid JSON", () => {
    const imageJson = '{"prompt":"a cat","width":1024,"height":1024}';
    const raw = `${imageJson}\n[PROMPT_TITLE]חתול[/PROMPT_TITLE]\n[GENIUS_QUESTIONS][]`;
    const { body } = parseTrailer(raw);
    expect(() => JSON.parse(body)).not.toThrow();
    expect(JSON.parse(body).prompt).toBe("a cat");
  });
});

// ── parseQuestionsJson (normalization) ──

describe("parseQuestionsJson", () => {
  it("normalizes all supported fields", () => {
    const raw = JSON.stringify([
      {
        id: 5,
        question: "מה התקציב?",
        description: "desc",
        examples: ["1000", "5000"],
        priority: 8,
        category: "context",
        impactEstimate: "+10 נקודות",
        required: true,
      },
    ]);
    const [q] = parseQuestionsJson(raw);
    expect(q).toEqual({
      id: 5,
      question: "מה התקציב?",
      description: "desc",
      examples: ["1000", "5000"],
      priority: 8,
      category: "context",
      impactEstimate: "+10 נקודות",
      required: true,
    });
  });

  it("drops non-object entries and entries without a string question", () => {
    const raw = JSON.stringify([
      42,
      null,
      { description: "no question here" },
      { question: "keep me" },
    ]);
    const result = parseQuestionsJson(raw);
    expect(result).toHaveLength(1);
    expect(result[0].question).toBe("keep me");
    expect(result[0].id).toBe(0);
    expect(result[0].examples).toEqual([]);
  });

  it("coerces non-string examples out of the array", () => {
    const raw = JSON.stringify([{ question: "q", examples: ["ok", 3, null, "yes"] }]);
    const [q] = parseQuestionsJson(raw);
    expect(q.examples).toEqual(["ok", "yes"]);
  });

  it("unwraps a { questions: [...] } envelope", () => {
    const raw = JSON.stringify({ questions: [{ question: "q" }] });
    expect(parseQuestionsJson(raw)).toHaveLength(1);
  });

  it("returns [] for empty, blank, or unrecoverable input", () => {
    expect(parseQuestionsJson("")).toEqual([]);
    expect(parseQuestionsJson("   ")).toEqual([]);
    expect(parseQuestionsJson("[]")).toEqual([]);
    expect(parseQuestionsJson("not json at all")).toEqual([]);
  });
});

// ── renderTrailerInstruction (producer) + round-trip ──

describe("renderTrailerInstruction", () => {
  it("emits both markers and the JSON format line", () => {
    const out = renderTrailerInstruction({ questionFocus: "ועד 3 שאלות. החזר מערך ריק []." });
    expect(out).toContain(TRAILER.TITLE_OPEN);
    expect(out).toContain(TRAILER.TITLE_CLOSE);
    expect(out).toContain(TRAILER.QUESTIONS);
    expect(out).toContain("ועד 3 שאלות");
    expect(out).toContain('"question": "..."');
  });

  it("producer↔consumer round-trip: a model that follows the instruction parses cleanly", () => {
    // Simulate a model that appended the rendered trailer after a body, filling
    // in the title and a real questions array.
    const instruction = renderTrailerInstruction({
      questionFocus: "ועד 3 שאלות חדשות. החזר מערך ריק [] אם מלא.",
    });
    expect(instruction).toContain(TRAILER.QUESTIONS);

    const modelOutput =
      "הפרומפט המשודרג כאן.\n" +
      `${TRAILER.TITLE_OPEN}כותרת לדוגמה${TRAILER.TITLE_CLOSE}\n` +
      `${TRAILER.QUESTIONS}[{"id":1,"question":"מי קהל היעד?","description":"","examples":["מנהלים"]}]`;

    const { body, trailer } = parseTrailer(modelOutput);
    expect(body).toBe("הפרומפט המשודרג כאן.");
    expect(trailer.title).toBe("כותרת לדוגמה");
    expect(trailer.questions).toHaveLength(1);
    expect(trailer.questions[0].question).toBe("מי קהל היעד?");
    expect(trailer.questions[0].examples).toEqual(["מנהלים"]);
  });

  it("falls back to a default focus sentence when none is supplied", () => {
    const out = renderTrailerInstruction({});
    expect(out).toContain(TRAILER.QUESTIONS);
    expect(out).toContain("החזר מערך ריק []");
  });
});
