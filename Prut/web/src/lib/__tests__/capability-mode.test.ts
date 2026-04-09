/**
 * capability-mode tests.
 *
 * Guards the two contracts every caller of parseCapabilityMode depends on:
 *
 * 1. Valid mode strings round-trip to the enum value. The mode routing
 *    layer (engines, UI gates, rate limiters) branches on the enum, so
 *    a subtle string-vs-enum mismatch would silently send a video request
 *    to the standard engine.
 *
 * 2. Unknown / null / undefined / garbage input falls back to STANDARD.
 *    Guest requests arrive from query params and cookies where the value
 *    can be anything. A bad value must not throw and must not leak into
 *    downstream enum switches as a hole.
 *
 * 3. The CAPABILITY_CONFIGS map has an entry for every enum value —
 *    a missing entry would crash the UI picker at runtime.
 */

import { describe, it, expect } from 'vitest';
import {
    CapabilityMode,
    CAPABILITY_CONFIGS,
    parseCapabilityMode,
} from '../capability-mode';

describe('parseCapabilityMode', () => {
    it('round-trips every enum value', () => {
        for (const mode of Object.values(CapabilityMode)) {
            expect(parseCapabilityMode(mode)).toBe(mode);
        }
    });

    it('returns STANDARD for null', () => {
        expect(parseCapabilityMode(null)).toBe(CapabilityMode.STANDARD);
    });

    it('returns STANDARD for undefined', () => {
        expect(parseCapabilityMode(undefined)).toBe(CapabilityMode.STANDARD);
    });

    it('returns STANDARD for empty string', () => {
        expect(parseCapabilityMode('')).toBe(CapabilityMode.STANDARD);
    });

    it('returns STANDARD for unknown mode string', () => {
        expect(parseCapabilityMode('MAGIC_MODE')).toBe(CapabilityMode.STANDARD);
    });

    it('is case-sensitive (lowercase enum string is rejected)', () => {
        // The enum values are all-uppercase by design. A lowercase match
        // would silently coerce typos into the wrong mode.
        expect(parseCapabilityMode('standard')).toBe(CapabilityMode.STANDARD);
        expect(parseCapabilityMode('image_generation')).toBe(CapabilityMode.STANDARD);
    });

    it('handles whitespace as unknown', () => {
        expect(parseCapabilityMode('  STANDARD  ')).toBe(CapabilityMode.STANDARD);
    });
});

describe('CAPABILITY_CONFIGS', () => {
    it('has an entry for every CapabilityMode', () => {
        for (const mode of Object.values(CapabilityMode)) {
            expect(CAPABILITY_CONFIGS[mode]).toBeDefined();
            expect(CAPABILITY_CONFIGS[mode].mode).toBe(mode);
        }
    });

    it('every config has Hebrew label + description (i18n completeness)', () => {
        for (const mode of Object.values(CapabilityMode)) {
            const cfg = CAPABILITY_CONFIGS[mode];
            expect(cfg.labelHe.length).toBeGreaterThan(0);
            expect(cfg.descriptionHe.length).toBeGreaterThan(0);
        }
    });

    it('VIDEO_GENERATION requires camera_movement + duration', () => {
        const cfg = CAPABILITY_CONFIGS[CapabilityMode.VIDEO_GENERATION];
        expect(cfg.requiredFields).toContain('camera_movement');
        expect(cfg.requiredFields).toContain('duration');
    });

    it('AGENT_BUILDER requires system_instructions', () => {
        const cfg = CAPABILITY_CONFIGS[CapabilityMode.AGENT_BUILDER];
        expect(cfg.requiredFields).toContain('system_instructions');
    });

    it('STANDARD and DEEP_RESEARCH have no required fields', () => {
        // These modes accept bare prompts — any required field would break
        // the empty-state homepage flow.
        expect(CAPABILITY_CONFIGS[CapabilityMode.STANDARD].requiredFields).toBeUndefined();
        expect(CAPABILITY_CONFIGS[CapabilityMode.DEEP_RESEARCH].requiredFields).toBeUndefined();
    });
});
