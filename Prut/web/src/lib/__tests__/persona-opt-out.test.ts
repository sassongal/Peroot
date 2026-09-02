/**
 * The persona opt-out is enforced in the query, not at the consumer.
 *
 * `user_style_personality` is read in two places, and both feed the
 * `[USER_PERSONALITY_TRAITS]` block that goes into the model. If either read
 * loses its `injection_enabled` filter, a user who switched the persona off in
 * Settings keeps getting it injected, and nothing visible fails. That is the
 * kind of regression only a test catches.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FILES = ["src/app/api/enhance/route.ts", "src/app/api/enhance/lib/user-context.ts"];

describe("persona injection", () => {
  for (const file of FILES) {
    it(`${file} filters the persona read on injection_enabled`, () => {
      const src = readFileSync(join(process.cwd(), file), "utf8");
      const idx = src.indexOf("user_style_personality");
      expect(idx, `${file} no longer reads user_style_personality`).toBeGreaterThan(-1);
      // The filter has to sit inside the same query, so look only at the
      // chain that follows the table name.
      const chain = src.slice(idx, idx + 600);
      expect(chain).toMatch(/injection_enabled['"]?,\s*true/);
    });
  }
});
