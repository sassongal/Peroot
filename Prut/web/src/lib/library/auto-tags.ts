import { extractKeywords } from "@/components/features/library/graph-utils";
import type { PersonalPrompt } from "@/lib/types";

/**
 * Tags for a prompt that arrived without any (master plan 3.6).
 *
 * Peroot Connect has tagged its saves since launch; the web save, which is how
 * almost every prompt actually gets into a library, did not. The consequence
 * was not cosmetic: the Memory Palace draws tag edges, so a library saved from
 * the site produced a graph with a whole edge type missing, and tag search had
 * nothing to find.
 *
 * Deliberately the same deterministic extractor the graph itself uses, not an
 * AI call. One vocabulary means a tag and a graph edge always agree, and the
 * save path stays synchronous and free.
 */
export function autoTags(title: string, prompt: string, limit = 5): string[] {
  const keywords = extractKeywords({ title, prompt } as unknown as PersonalPrompt, limit);
  return [...keywords].slice(0, limit);
}
