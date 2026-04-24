"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { AIGateway } from "@/lib/ai/gateway";
import { logger } from "@/lib/logger";

export interface ExtractedFact {
  fact: string;
  category: string;
  confidence: number;
}

const EXTRACTION_SYSTEM = `You are a memory extraction engine. Extract 0-5 atomic personal facts about the USER from their prompt.

Rules:
- Extract ONLY facts about the user (their job, goals, style preferences, current projects, domain, language)
- Skip generic task descriptions with no personal signal
- Each fact must be self-contained and useful for future AI personalization
- Confidence: 0.9 = explicit ("I am a..."), 0.7 = strongly implied, skip anything below 0.65
- Valid categories: professional | personal | preference | project | language | general

Return ONLY valid JSON with no extra text:
{"facts": [{"fact": "...", "category": "...", "confidence": 0.X}]}

If no useful facts, return: {"facts": []}`;

const MAX_FACT_LEN = 200;

// Reject facts that look like instructions/commands rather than descriptive
// metadata about the user. These words flag a probable prompt-injection
// attempt that slipped through the LLM extractor.
const IMPERATIVE_DENYLIST = [
  "ignore",
  "disregard",
  "forget",
  "override",
  "bypass",
  "you must",
  "you should",
  "you are now",
  "act as",
  "pretend",
  "system:",
  "assistant:",
  "instruction:",
  "prompt:",
  "reveal",
  "disclose",
  "leak",
  "output",
  "print",
  "delete",
  "drop table",
  "<script",
  "</script",
  "http://",
  "https://",
  "javascript:",
  "data:",
];

function looksLikeInjection(fact: string): boolean {
  const lower = fact.toLowerCase();
  return IMPERATIVE_DENYLIST.some((needle) => lower.includes(needle));
}

export async function extractFacts(promptText: string): Promise<ExtractedFact[]> {
  if (promptText.trim().length < 20) return [];

  try {
    const { text } = await AIGateway.generateFull({
      system: EXTRACTION_SYSTEM,
      prompt: `Extract personal facts about the user from this prompt:\n\n${promptText.slice(0, 2000)}`,
      task: "classify",
      userTier: "pro",
    });

    const jsonMatch = text.trim().match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as { facts?: unknown[] };
    if (!Array.isArray(parsed.facts)) return [];

    return (parsed.facts as ExtractedFact[])
      .filter(
        (f) =>
          f &&
          typeof f.fact === "string" &&
          f.fact.length > 5 &&
          f.fact.length <= MAX_FACT_LEN &&
          typeof f.category === "string" &&
          typeof f.confidence === "number" &&
          f.confidence >= 0.65 &&
          !looksLikeInjection(f.fact),
      )
      .map((f) => ({ ...f, fact: f.fact.slice(0, MAX_FACT_LEN) }))
      .slice(0, 5);
  } catch {
    return [];
  }
}

export async function mergeFactsForUser(userId: string, newFacts: ExtractedFact[]): Promise<void> {
  if (newFacts.length === 0) return;

  const sb = createServiceClient();

  const { data: existing, error } = await sb
    .from("user_memory_facts")
    .select("id, fact, category")
    .eq("user_id", userId)
    .limit(100);

  if (error) {
    logger.warn("[FactExtractor] Failed to fetch existing facts:", error.message);
    return;
  }

  const existingFacts = existing ?? [];
  if (existingFacts.length >= 100) return;

  const toInsert: Array<{
    user_id: string;
    fact: string;
    category: string;
    confidence: number;
    source: string;
  }> = [];

  for (const newFact of newFacts) {
    const newWords = new Set(
      newFact.fact
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );

    let isDuplicate = false;
    let updateId: string | null = null;

    for (const ex of existingFacts) {
      const exWords = new Set(
        ex.fact
          .toLowerCase()
          .split(/\s+/)
          .filter((w: string) => w.length > 3),
      );
      const intersection = [...newWords].filter((w: string) => exWords.has(w)).length;
      const similarity = newWords.size > 0 ? intersection / newWords.size : 0;

      if (similarity > 0.6) {
        if (ex.category === newFact.category) {
          updateId = ex.id as string;
        } else {
          isDuplicate = true;
        }
        break;
      }
    }

    if (isDuplicate) continue;

    if (updateId) {
      await sb
        .from("user_memory_facts")
        .update({ fact: newFact.fact, confidence: newFact.confidence })
        .eq("id", updateId);
    } else if (existingFacts.length + toInsert.length < 100) {
      toInsert.push({
        user_id: userId,
        fact: newFact.fact,
        category: newFact.category,
        confidence: newFact.confidence,
        source: "auto",
      });
    }
  }

  if (toInsert.length > 0) {
    const { error: insertErr } = await sb.from("user_memory_facts").insert(toInsert);
    if (insertErr) {
      logger.warn("[FactExtractor] Insert failed:", insertErr.message);
    }
  }
}
