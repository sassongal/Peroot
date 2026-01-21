import { readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

const benchUrl = process.env.BENCH_URL || "http://localhost:3000/api/enhance";
const inputPath = process.env.BENCH_INPUT || new URL("../benchmarks/prompts.json", import.meta.url);
const outputPath = process.env.BENCH_OUT;

const raw = await readFile(inputPath, "utf-8");
const prompts = JSON.parse(raw);

const results = [];

for (let i = 0; i < prompts.length; i += 1) {
  const entry = prompts[i];
  const start = performance.now();
  const response = await fetch(benchUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  const elapsed = performance.now() - start;

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = { error: "Invalid JSON response" };
  }

  const questions = Array.isArray(payload?.clarifying_questions)
    ? payload.clarifying_questions.length
    : null;

  results.push({
    index: i + 1,
    ok: response.ok,
    status: response.status,
    ms: Math.round(elapsed),
    questions,
    promptLength: typeof payload?.great_prompt === "string" ? payload.great_prompt.length : null,
  });
}

const okResults = results.filter((row) => row.ok);
const avgMs = okResults.length
  ? Math.round(okResults.reduce((sum, row) => sum + row.ms, 0) / okResults.length)
  : null;
const avgQuestions = okResults.length
  ? Number((okResults.reduce((sum, row) => sum + (row.questions ?? 0), 0) / okResults.length).toFixed(2))
  : null;

console.table(results);
console.log(`Average latency (ok): ${avgMs ?? "n/a"} ms`);
console.log(`Average questions (ok): ${avgQuestions ?? "n/a"}`);

if (outputPath) {
  const payload = {
    benchUrl,
    total: results.length,
    ok: okResults.length,
    avgMs,
    avgQuestions,
    results,
  };
  await writeFile(outputPath, JSON.stringify(payload, null, 2), "utf-8");
}
