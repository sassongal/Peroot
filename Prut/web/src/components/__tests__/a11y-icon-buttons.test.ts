/**
 * Every icon-only button carries an accessible name.
 *
 * A `<button>` whose only child is an icon reads to a screen reader as
 * "button" and nothing else, so a user who cannot see the glyph has no way to
 * know what it does. Eighteen of them shipped: close, refresh, copy, add tag,
 * add folder. A `title` attribute is not enough on its own, since it is not
 * announced reliably.
 *
 * The rule is narrow on purpose: a button with any text, or with text produced
 * by an expression, already has a name and is not checked here.
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const BUTTON = /<button\b[^>]*?>([\s\S]*?)<\/button>/g;

function tsxFiles(): string[] {
  const out = execFileSync("grep", ["-rl", "<button", "--include=*.tsx", "src"], {
    encoding: "utf8",
  });
  return out.split("\n").filter(Boolean);
}

describe("icon-only buttons", () => {
  it("all have an aria-label", () => {
    const offenders: string[] = [];

    for (const file of tsxFiles()) {
      const src = readFileSync(file, "utf8");
      BUTTON.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = BUTTON.exec(src)) !== null) {
        const tag = m[0];
        const head = tag.slice(0, tag.indexOf(">") + 1);
        if (head.includes("aria-label")) continue;
        // Nothing but nested elements between the tags means no name.
        if (m[1].replace(/<[^>]*>/g, "").trim()) continue;
        offenders.push(`${file}:${src.slice(0, m.index).split("\n").length}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
