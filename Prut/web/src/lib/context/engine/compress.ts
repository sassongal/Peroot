import { estimateTokens } from "@/lib/context/token-counter";

export interface CompressResult {
  text: string;
  truncated: boolean;
  originalTokenCount: number;
  finalTokenCount: number;
}

export type CompressionStrategy = "code" | "data" | "contract" | "academic" | "default";

const SEPARATOR = "\n\n[...קוצר...]\n\n";

/**
 * Trim text to a token budget using a document-type-aware strategy.
 *
 * Strategies:
 *   code     — signature lines first (function/class/interface), then head
 *   data     — header row preserved; first-N + last-N rows fill remaining budget
 *   contract — head 50% / tail 50% (recitals + penalty clauses both preserved)
 *   academic — head 30% (abstract) + tail 30% (conclusion) + middle 40%
 *   default  — head 70% / tail 30% (unchanged legacy behaviour)
 */
export function compressToLimit(
  text: string,
  maxTokens: number,
  strategy: CompressionStrategy = "default",
): CompressResult {
  const original = estimateTokens(text);
  if (original <= maxTokens) {
    return { text, truncated: false, originalTokenCount: original, finalTokenCount: original };
  }

  const charBudget = maxTokens * 4;
  let cut: string;

  switch (strategy) {
    case "code": {
      const lines = text.split("\n");
      const sigPattern =
        /^\s*(export\s+)?(async\s+)?(function|class|interface|const\s+\w[\w$]*\s*[:=].*=>|def |public |private |protected |abstract )/;
      const sigLines = lines.filter((l) => sigPattern.test(l));
      const sigBlock = sigLines.join("\n");
      if (sigBlock.length >= charBudget) {
        cut = sigBlock.slice(0, charBudget);
      } else {
        const bodyBudget = charBudget - sigBlock.length - SEPARATOR.length;
        cut = sigBlock + SEPARATOR + text.slice(0, Math.max(0, bodyBudget));
      }
      break;
    }

    case "data": {
      const lines = text.split("\n");
      const header = lines[0] ?? "";
      const dataLines = lines.slice(1);
      const contentBudget = charBudget - header.length - SEPARATOR.length * 2;
      const half = Math.floor(contentBudget / 2);
      const headLines: string[] = [];
      let used = 0;
      for (const line of dataLines) {
        if (used + line.length + 1 > half) break;
        headLines.push(line);
        used += line.length + 1;
      }
      const tailLines: string[] = [];
      used = 0;
      for (let i = dataLines.length - 1; i >= 0; i--) {
        const line = dataLines[i];
        if (used + line.length + 1 > half) break;
        tailLines.unshift(line);
        used += line.length + 1;
      }
      cut = [header, headLines.join("\n"), SEPARATOR.trim(), tailLines.join("\n")].join("\n");
      break;
    }

    case "contract": {
      const headChars = Math.floor(charBudget * 0.5);
      const tailChars = charBudget - headChars - SEPARATOR.length;
      cut = text.slice(0, headChars) + SEPARATOR + text.slice(-Math.max(0, tailChars));
      break;
    }

    case "academic": {
      const headChars = Math.floor(charBudget * 0.3);
      const tailChars = Math.floor(charBudget * 0.3);
      const midChars = Math.max(0, charBudget - headChars - tailChars);
      // Clamp slices to prevent overlap when text is shorter than the budget.
      const safeHead = Math.min(headChars, text.length);
      const safeTail = Math.min(tailChars, Math.max(0, text.length - safeHead));
      const rawMidStart = Math.floor(text.length / 2) - Math.floor(midChars / 2);
      const safeMidStart = Math.max(safeHead, rawMidStart);
      const safeMidEnd = Math.min(safeMidStart + midChars, text.length - safeTail);
      const head = text.slice(0, safeHead);
      const middle = safeMidEnd > safeMidStart ? text.slice(safeMidStart, safeMidEnd) : "";
      const tail = safeTail > 0 ? text.slice(-safeTail) : "";
      cut = head + (middle ? SEPARATOR + middle : "") + (tail ? SEPARATOR + tail : "");
      break;
    }

    default: {
      const headChars = Math.floor(charBudget * 0.7);
      const tailChars = charBudget - headChars - SEPARATOR.length;
      cut = text.slice(0, headChars) + SEPARATOR + text.slice(-Math.max(0, tailChars));
    }
  }

  return {
    text: cut,
    truncated: true,
    originalTokenCount: original,
    finalTokenCount: estimateTokens(cut),
  };
}
