#!/usr/bin/env tsx
/**
 * update-quality-baseline.ts
 *
 * Regenerates src/lib/engines/__tests__/quality-baseline.json — the
 * committed snapshot of EnhancedScorer output for every quality fixture.
 *
 * When to run:
 *   - After intentionally improving the scoring algorithm
 *   - After adding or tuning skill files that shift scores upward
 *   - After adding new fixtures
 *
 * When NOT to run:
 *   - To silence a failing regression test. The test is there to catch
 *     unintentional drops. Investigate first.
 *
 * Usage:
 *   npx tsx scripts/update-quality-baseline.ts
 *
 * The script prints a diff summary so you can see exactly what changed
 * before committing the new baseline.
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { CapabilityMode } from '../src/lib/capability-mode';
import { EnhancedScorer } from '../src/lib/engines/scoring/enhanced-scorer';
import {
  badTextFixtures,
  weakTextFixtures,
  mediumTextFixtures,
  strongTextFixtures,
  eliteTextFixtures,
  badVisualFixtures,
  strongVisualFixtures,
  strongVideoFixtures,
} from '../src/lib/engines/__tests__/quality-fixtures';

interface FixtureGroup {
  label: string;
  mode: CapabilityMode;
  fixtures: ReadonlyArray<{ name: string; prompt: string }>;
}

const GROUPS: FixtureGroup[] = [
  { label: 'badText', mode: CapabilityMode.STANDARD, fixtures: badTextFixtures },
  { label: 'weakText', mode: CapabilityMode.STANDARD, fixtures: weakTextFixtures },
  { label: 'mediumText', mode: CapabilityMode.STANDARD, fixtures: mediumTextFixtures },
  { label: 'strongText', mode: CapabilityMode.STANDARD, fixtures: strongTextFixtures },
  { label: 'eliteText', mode: CapabilityMode.STANDARD, fixtures: eliteTextFixtures },
  { label: 'badVisual', mode: CapabilityMode.IMAGE_GENERATION, fixtures: badVisualFixtures },
  { label: 'strongVisual', mode: CapabilityMode.IMAGE_GENERATION, fixtures: strongVisualFixtures },
  { label: 'strongVideo', mode: CapabilityMode.VIDEO_GENERATION, fixtures: strongVideoFixtures },
];

interface BaselineEntry {
  group: string;
  name: string;
  score: number;
  level: string;
}

interface Baseline {
  generatedAt: string;
  fixtureCount: number;
  averageScore: number;
  entries: BaselineEntry[];
  groupAverages: Record<string, number>;
}

function computeBaseline(): Baseline {
  const entries: BaselineEntry[] = [];
  const groupSums: Record<string, { sum: number; n: number }> = {};

  for (const group of GROUPS) {
    groupSums[group.label] = { sum: 0, n: 0 };
    for (const fx of group.fixtures) {
      const result = EnhancedScorer.score(fx.prompt, group.mode);
      entries.push({
        group: group.label,
        name: fx.name,
        score: result.total,
        level: result.level,
      });
      groupSums[group.label].sum += result.total;
      groupSums[group.label].n += 1;
    }
  }

  const totalSum = entries.reduce((s, e) => s + e.score, 0);
  const averageScore = entries.length > 0 ? +(totalSum / entries.length).toFixed(2) : 0;

  const groupAverages: Record<string, number> = {};
  for (const [label, { sum, n }] of Object.entries(groupSums)) {
    groupAverages[label] = n > 0 ? +(sum / n).toFixed(2) : 0;
  }

  return {
    generatedAt: new Date().toISOString(),
    fixtureCount: entries.length,
    averageScore,
    entries: entries.sort((a, b) =>
      a.group === b.group ? a.name.localeCompare(b.name) : a.group.localeCompare(b.group)
    ),
    groupAverages,
  };
}

function printDiff(prev: Baseline | null, next: Baseline) {
  if (!prev) {
    console.log(`\n[new baseline] ${next.fixtureCount} fixtures, avg ${next.averageScore}\n`);
    for (const e of next.entries) {
      console.log(`  + ${e.group}/${e.name}: ${e.score} (${e.level})`);
    }
    return;
  }

  const prevMap = new Map(prev.entries.map((e) => [`${e.group}/${e.name}`, e]));
  let changed = 0;

  console.log(`\n[baseline diff] avg ${prev.averageScore} → ${next.averageScore}`);
  console.log(`[baseline diff] fixtures ${prev.fixtureCount} → ${next.fixtureCount}\n`);

  for (const e of next.entries) {
    const key = `${e.group}/${e.name}`;
    const old = prevMap.get(key);
    if (!old) {
      console.log(`  + ${key}: ${e.score} (${e.level})  [new fixture]`);
      changed++;
    } else if (old.score !== e.score) {
      const delta = e.score - old.score;
      const sign = delta > 0 ? '+' : '';
      console.log(`  ~ ${key}: ${old.score} → ${e.score} (${sign}${delta})`);
      changed++;
      prevMap.delete(key);
    } else {
      prevMap.delete(key);
    }
  }

  for (const [key, old] of prevMap) {
    console.log(`  - ${key}: ${old.score}  [removed fixture]`);
    changed++;
  }

  if (changed === 0) {
    console.log('  (no changes)');
  } else {
    console.log(`\n${changed} change(s).`);
  }
}

// ────────────────────────────────────────────────────────────────────────────

const BASELINE_PATH = join(
  import.meta.dirname ?? __dirname,
  '..',
  'src',
  'lib',
  'engines',
  '__tests__',
  'quality-baseline.json'
);

const previous: Baseline | null = existsSync(BASELINE_PATH)
  ? (JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline)
  : null;

const next = computeBaseline();

printDiff(previous, next);

writeFileSync(BASELINE_PATH, JSON.stringify(next, null, 2) + '\n');
console.log(`\nWritten: ${BASELINE_PATH}\n`);
