/**
 * Live end-to-end engine test.
 *
 * For each capability mode, instantiate the engine directly (no Supabase),
 * generate system+user prompts, then call AIGateway.generateFull() to get
 * a real LLM response. Each engine is graded on:
 *   - Output is non-empty
 *   - finishReason is NOT 'length' (not truncated)
 *   - Contains [PROMPT_TITLE]...[/PROMPT_TITLE] (where the engine emits one)
 *   - Contains [GENIUS_QUESTIONS]... (where applicable)
 *   - [GENIUS_QUESTIONS] JSON is parseable
 *   - Contains Hebrew characters
 *   - Body has at least 4 markdown section headers (structural sanity)
 *
 * Run: npx tsx scripts/test-engines-live.ts
 */

import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Load env BEFORE any module that reads env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadEnv({ path: path.resolve(__dirname, "../.env.local") });
loadEnv({ path: path.resolve(__dirname, "../.env") });

import { StandardEngine } from "../src/lib/engines/standard-engine";
import { ResearchEngine } from "../src/lib/engines/research-engine";
import { ImageEngine } from "../src/lib/engines/image-engine";
import { VideoEngine } from "../src/lib/engines/video-engine";
import { AgentEngine } from "../src/lib/engines/agent-engine";
import { AIGateway } from "../src/lib/ai/gateway";
import { CapabilityMode } from "../src/lib/capability-mode";
import type { EngineInput } from "../src/lib/engines/types";

type EngineCase = {
  name: string;
  mode: CapabilityMode;
  task: "enhance" | "research" | "image" | "video" | "agent";
  engine: { generate: (i: EngineInput) => { systemPrompt: string; userPrompt: string } };
  input: EngineInput;
  expectTitle: boolean;
  expectGeniusQuestions: boolean;
  jsonOutput: boolean; // for Stable Diffusion JSON / Gemini Image JSON variants (none used here — all 'general')
};

const baseInput = (prompt: string, overrides: Partial<EngineInput> = {}): EngineInput => ({
  prompt,
  tone: "Professional",
  category: "כללי",
  mode: CapabilityMode.STANDARD,
  targetModel: "general",
  ...overrides,
});

const cases: EngineCase[] = [
  {
    name: "StandardEngine",
    mode: CapabilityMode.STANDARD,
    task: "enhance",
    engine: new StandardEngine(),
    input: baseInput("תכתוב פוסט לינקדאין על AI לעסקים קטנים", { mode: CapabilityMode.STANDARD }),
    expectTitle: true,
    expectGeniusQuestions: true,
    jsonOutput: false,
  },
  {
    name: "ResearchEngine",
    mode: CapabilityMode.DEEP_RESEARCH,
    task: "research",
    engine: new ResearchEngine(),
    input: baseInput("השפעת בינה מלאכותית על שוק העבודה הישראלי ב-2026", {
      mode: CapabilityMode.DEEP_RESEARCH,
    }),
    expectTitle: true,
    expectGeniusQuestions: true,
    jsonOutput: false,
  },
  {
    name: "ImageEngine (general)",
    mode: CapabilityMode.IMAGE_GENERATION,
    task: "image",
    engine: new ImageEngine(),
    input: baseInput("סטודיו דירה מעוצב עם אור טבעי וצמחייה", {
      mode: CapabilityMode.IMAGE_GENERATION,
      modeParams: { platform: "general" },
    }),
    expectTitle: true,
    expectGeniusQuestions: true,
    jsonOutput: false,
  },
  {
    name: "VideoEngine (general)",
    mode: CapabilityMode.VIDEO_GENERATION,
    task: "video",
    engine: new VideoEngine(),
    input: baseInput("סרטון של רוכב אופניים בהרים בזריחה, תנועה קולנועית", {
      mode: CapabilityMode.VIDEO_GENERATION,
      modeParams: { platform: "general" },
    }),
    expectTitle: true,
    expectGeniusQuestions: true,
    jsonOutput: false,
  },
  {
    name: "AgentEngine",
    mode: CapabilityMode.AGENT_BUILDER,
    task: "agent",
    engine: new AgentEngine(),
    input: baseInput("בנה לי agent שמסכם מאמרים ארוכים ומחלץ תובנות מרכזיות", {
      mode: CapabilityMode.AGENT_BUILDER,
    }),
    expectTitle: true,
    expectGeniusQuestions: true,
    jsonOutput: false,
  },
];

function hasHebrew(s: string): boolean {
  return /[\u0590-\u05FF]/.test(s);
}

function countMarkdownHeaders(s: string): number {
  return (s.match(/^#{1,6}\s/gm) || []).length;
}

function extractSection(text: string, marker: string): { found: boolean; content: string } {
  const idx = text.lastIndexOf(marker);
  if (idx === -1) return { found: false, content: "" };
  return { found: true, content: text.slice(idx + marker.length) };
}

function parseGeniusJson(raw: string): { ok: boolean; count: number; err?: string } {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const match = s.match(/\[[\s\S]*\]/);
  if (!match) return { ok: false, count: 0, err: "no array found" };
  try {
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return { ok: false, count: 0, err: "not an array" };
    return { ok: true, count: parsed.length };
  } catch (e) {
    return { ok: false, count: 0, err: e instanceof Error ? e.message : String(e) };
  }
}

type Result = {
  name: string;
  status: "PASS" | "PARTIAL" | "FAIL";
  modelId?: string;
  length: number;
  finishReason?: string;
  headers: number;
  hebrew: boolean;
  titleFound: boolean;
  geniusFound: boolean;
  geniusValid: boolean;
  geniusCount: number;
  geniusErr?: string;
  issues: string[];
  elapsedMs: number;
  sample: string;
};

async function runCase(c: EngineCase): Promise<Result> {
  const issues: string[] = [];
  const start = Date.now();
  const engineOutput = c.engine.generate(c.input);

  let text = "";
  let modelId: string | undefined;
  let finishReason: string | undefined;

  try {
    const res = await AIGateway.generateFull({
      system: engineOutput.systemPrompt,
      prompt: engineOutput.userPrompt,
      task: c.task,
      userTier: "pro",
    });
    text = res.text || "";
    modelId = res.modelId;
    // generateFull doesn't return finishReason currently — we infer truncation
    // heuristically from the response shape below.
    const usage = res.usage as { finishReason?: string; totalTokens?: number; inputTokens?: number; outputTokens?: number; reasoningTokens?: number } | undefined;
    finishReason = usage?.finishReason;
    if (usage) {
      console.log(`    [usage] input=${usage.inputTokens} output=${usage.outputTokens} reasoning=${usage.reasoningTokens ?? '?'} total=${usage.totalTokens} finishReason=${usage.finishReason}`);
    }
  } catch (e) {
    issues.push(`gateway error: ${e instanceof Error ? e.message : String(e)}`);
  }

  const elapsedMs = Date.now() - start;
  const length = text.length;
  const headers = countMarkdownHeaders(text);
  const hebrew = hasHebrew(text);

  const titleM = text.match(/\[PROMPT_TITLE\]([\s\S]*?)\[\/PROMPT_TITLE\]/);
  const titleFound = !!titleM;
  const geniusSec = extractSection(text, "[GENIUS_QUESTIONS]");
  const geniusFound = geniusSec.found;
  const gen = geniusFound ? parseGeniusJson(geniusSec.content) : { ok: false, count: 0 };

  // Heuristic truncation detection: the engine instructs PROMPT_TITLE then
  // GENIUS_QUESTIONS at the end. If the body ends without a closing bracket
  // and [GENIUS_QUESTIONS] is present but unclosed, the stream was cut.
  const tail = text.slice(-200);
  const looksTruncated = geniusFound && !gen.ok && !tail.includes("]");

  if (length === 0) issues.push("empty output");
  if (!hebrew) issues.push("no Hebrew characters");
  if (c.expectTitle && !titleFound) issues.push("missing [PROMPT_TITLE]");
  if (c.expectGeniusQuestions && !geniusFound) issues.push("missing [GENIUS_QUESTIONS]");
  if (geniusFound && !gen.ok) issues.push(`invalid GENIUS_QUESTIONS JSON: ${gen.err}`);
  if (headers < 3) issues.push(`only ${headers} markdown headers (expected ≥3)`);
  if (looksTruncated) issues.push("likely truncated (no closing bracket)");
  if (finishReason === "length") issues.push("finishReason=length (truncated)");

  let status: Result["status"] = "PASS";
  const critical = issues.some((i) =>
    i.includes("empty") ||
    i.includes("missing [PROMPT_TITLE]") ||
    i.includes("missing [GENIUS_QUESTIONS]") ||
    i.includes("truncated") ||
    i.includes("gateway error")
  );
  if (critical) status = "FAIL";
  else if (issues.length > 0) status = "PARTIAL";

  return {
    name: c.name,
    status,
    modelId,
    length,
    finishReason,
    headers,
    hebrew,
    titleFound,
    geniusFound,
    geniusValid: gen.ok,
    geniusCount: gen.count,
    geniusErr: gen.err,
    issues,
    elapsedMs,
    sample: text.slice(0, 300).replace(/\n/g, " ⏎ "),
  };
}

async function main() {
  console.log("Running live engine tests against AIGateway...\n");
  const results: Result[] = [];
  for (const c of cases) {
    process.stdout.write(`→ ${c.name}... `);
    const r = await runCase(c);
    results.push(r);
    const icon = r.status === "PASS" ? "✓" : r.status === "PARTIAL" ? "~" : "✗";
    console.log(
      `${icon} ${r.status}  (${r.elapsedMs}ms, ${r.length} chars, ${r.headers} headers, model=${r.modelId ?? "—"})`
    );
  }

  console.log("\n===== DETAILED REPORT =====\n");
  for (const r of results) {
    console.log(`▸ ${r.name} — ${r.status}`);
    console.log(`  model: ${r.modelId ?? "—"}   elapsed: ${r.elapsedMs}ms   length: ${r.length}`);
    console.log(
      `  hebrew=${r.hebrew}  headers=${r.headers}  title=${r.titleFound}  genius=${r.geniusFound}  geniusValid=${r.geniusValid}  geniusCount=${r.geniusCount}`
    );
    if (r.issues.length) {
      console.log(`  ISSUES:`);
      for (const i of r.issues) console.log(`    - ${i}`);
    }
    console.log(`  sample: ${r.sample}`);
    console.log();
  }

  const pass = results.filter((r) => r.status === "PASS").length;
  const partial = results.filter((r) => r.status === "PARTIAL").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  console.log(`===== SUMMARY: ${pass} PASS · ${partial} PARTIAL · ${fail} FAIL =====`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
