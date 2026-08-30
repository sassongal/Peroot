import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PEROOT_COMMANDS, CONNECT_CAPABILITIES } from "@/lib/connect/commands";

/**
 * The /peroot: command family has ONE source of truth (commands.ts) consumed
 * by both /api/mcp and the /connect page. These tests pin that contract —
 * before it existed, /peroot:help was served by MCP but missing from the page.
 */
describe("command family sync", () => {
  it("has the full 9-command family, help included", () => {
    expect(PEROOT_COMMANDS.map((c) => c.name)).toEqual([
      "enhance",
      "image",
      "video",
      "research",
      "agent",
      "save",
      "find",
      "quota",
      "help",
    ]);
  });

  it("every command carries both MCP and page descriptions in Hebrew", () => {
    for (const c of PEROOT_COMMANDS) {
      expect(c.mcpTitle.length, c.name).toBeGreaterThan(3);
      expect(/[֐-׿]/.test(c.mcpDescription), c.name).toBe(true);
      expect(/[֐-׿]/.test(c.pageDescription), c.name).toBe(true);
    }
  });

  it("the MCP route and /connect page both consume the shared source", () => {
    const root = process.cwd();
    const mcp = readFileSync(join(root, "src", "app", "api", "mcp", "route.ts"), "utf8");
    const page = readFileSync(join(root, "src", "app", "(public)", "connect", "page.tsx"), "utf8");
    expect(mcp).toContain('from "@/lib/connect/commands"');
    expect(page).toContain('from "@/lib/connect/commands"');
    // Neither may re-declare its own command list.
    expect(page).not.toMatch(/cmd:\s*"\/peroot:/);
  });

  it("capability groups exist for the page (non-command tool surface)", () => {
    expect(CONNECT_CAPABILITIES.length).toBeGreaterThanOrEqual(5);
  });
});
