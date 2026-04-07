/**
 * Quality Baseline Regression Test
 *
 * Locks in the exact EnhancedScorer output for every fixture against a
 * committed JSON snapshot (`quality-baseline.json`). Unlike the existing
 * `quality-regression.test.ts` (which uses wide min/max bands), this test
 * is tight: it fails if any fixture drifts more than 3 points from baseline
 * OR if the global average drifts more than 2 points.
 *
 * The tight bound is what turns this into an early warning system:
 *     - Someone tweaks a skill file → scores drift → PR diff shows exactly
 *       which fixtures moved and by how much → reviewer can tell intent.
 *     - Someone ships an actual improvement → test fails → they run
 *       `npm run update-baseline` → PR now contains both the code change
 *       AND the baseline JSON diff → reviewer approves both atomically.
 *
 * To regenerate after an intentional improvement:
 *     npm run update-baseline
 */

import { describe, it, expect } from 'vitest';
import baseline from './quality-baseline.json';
import { CapabilityMode } from '@/lib/capability-mode';
import { EnhancedScorer } from '@/lib/engines/scoring/enhanced-scorer';
import {
  badTextFixtures,
  weakTextFixtures,
  mediumTextFixtures,
  strongTextFixtures,
  eliteTextFixtures,
  badVisualFixtures,
  strongVisualFixtures,
  strongVideoFixtures,
} from './quality-fixtures';

const PER_FIXTURE_TOLERANCE = 3;
const GLOBAL_AVERAGE_TOLERANCE = 2;

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

const typedBaseline = baseline as Baseline;

const GROUPS = [
  { label: 'badText', mode: CapabilityMode.STANDARD, fixtures: badTextFixtures },
  { label: 'weakText', mode: CapabilityMode.STANDARD, fixtures: weakTextFixtures },
  { label: 'mediumText', mode: CapabilityMode.STANDARD, fixtures: mediumTextFixtures },
  { label: 'strongText', mode: CapabilityMode.STANDARD, fixtures: strongTextFixtures },
  { label: 'eliteText', mode: CapabilityMode.STANDARD, fixtures: eliteTextFixtures },
  { label: 'badVisual', mode: CapabilityMode.IMAGE_GENERATION, fixtures: badVisualFixtures },
  { label: 'strongVisual', mode: CapabilityMode.IMAGE_GENERATION, fixtures: strongVisualFixtures },
  { label: 'strongVideo', mode: CapabilityMode.VIDEO_GENERATION, fixtures: strongVideoFixtures },
] as const;

function lookup(group: string, name: string): BaselineEntry | undefined {
  return typedBaseline.entries.find((e) => e.group === group && e.name === name);
}

describe('Quality baseline — committed snapshot', () => {
  describe('every fixture stays within ±3 points of baseline', () => {
    for (const group of GROUPS) {
      for (const fx of group.fixtures) {
        it(`${group.label}/"${fx.name}"`, () => {
          const expected = lookup(group.label, fx.name);
          if (!expected) {
            throw new Error(
              `No baseline entry for ${group.label}/${fx.name}. ` +
                `Run \`npm run update-baseline\` to add it.`
            );
          }
          const actual = EnhancedScorer.score(fx.prompt, group.mode).total;
          const delta = actual - expected.score;
          if (Math.abs(delta) > PER_FIXTURE_TOLERANCE) {
            const direction = delta > 0 ? 'IMPROVEMENT' : 'REGRESSION';
            throw new Error(
              `${direction}: ${group.label}/${fx.name} scored ${actual}, ` +
                `baseline is ${expected.score} (delta ${delta > 0 ? '+' : ''}${delta}). ` +
                `If this is an intentional improvement, run \`npm run update-baseline\` ` +
                `and commit the new quality-baseline.json.`
            );
          }
          expect(Math.abs(delta)).toBeLessThanOrEqual(PER_FIXTURE_TOLERANCE);
        });
      }
    }
  });

  it('global average stays within ±2 points of baseline', () => {
    let total = 0;
    let count = 0;
    for (const group of GROUPS) {
      for (const fx of group.fixtures) {
        total += EnhancedScorer.score(fx.prompt, group.mode).total;
        count += 1;
      }
    }
    const currentAverage = count > 0 ? total / count : 0;
    const delta = currentAverage - typedBaseline.averageScore;
    expect(Math.abs(delta)).toBeLessThanOrEqual(GLOBAL_AVERAGE_TOLERANCE);
  });

  it('baseline contains an entry for every live fixture', () => {
    const liveKeys = new Set<string>();
    for (const group of GROUPS) {
      for (const fx of group.fixtures) {
        liveKeys.add(`${group.label}/${fx.name}`);
      }
    }
    const baselineKeys = new Set(typedBaseline.entries.map((e) => `${e.group}/${e.name}`));
    const missing = [...liveKeys].filter((k) => !baselineKeys.has(k));
    const orphaned = [...baselineKeys].filter((k) => !liveKeys.has(k));
    if (missing.length > 0 || orphaned.length > 0) {
      throw new Error(
        `Baseline drift detected. Missing from baseline: ${missing.join(', ') || 'none'}. ` +
          `Orphaned in baseline: ${orphaned.join(', ') || 'none'}. ` +
          `Run \`npm run update-baseline\` to sync.`
      );
    }
    expect(missing).toHaveLength(0);
    expect(orphaned).toHaveLength(0);
  });
});
