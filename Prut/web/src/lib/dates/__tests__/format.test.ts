/**
 * One date format, one number format.
 *
 * Dates and counts were formatted inline in 45 files, three different ways:
 * `he-IL`, `en-US`, and a bare `toLocaleString()` that silently followed the
 * viewer's browser locale. Two counters on one admin screen could group
 * differently, and the admin dashboard showed English dates inside Hebrew
 * sentences.
 */
import { describe, it, expect } from "vitest";
import { formatDateHe, formatTimeHe, formatNumberHe, formatAbsoluteHe } from "../format";

describe("formatDateHe", () => {
  it("formats an ISO string in the Hebrew locale", () => {
    const out = formatDateHe("2026-09-02T10:30:00Z");
    expect(out).toMatch(/\d{2}\.\d{2}\.\d{4}/);
  });

  it("accepts a Date and an epoch, not only a string", () => {
    expect(formatDateHe(new Date("2026-09-02T00:00:00Z"))).not.toBe("");
    expect(formatDateHe(Date.parse("2026-09-02T00:00:00Z"))).not.toBe("");
  });

  it("returns an empty string instead of 'Invalid Date'", () => {
    expect(formatDateHe(null)).toBe("");
    expect(formatDateHe(undefined)).toBe("");
    expect(formatDateHe("")).toBe("");
    expect(formatDateHe("not a date")).toBe("");
  });
});

describe("formatTimeHe", () => {
  it("returns hours and minutes", () => {
    expect(formatTimeHe("2026-09-02T10:30:00Z")).toMatch(/\d{1,2}:\d{2}/);
  });

  it("survives bad input", () => {
    expect(formatTimeHe(null)).toBe("");
    expect(formatTimeHe("nope")).toBe("");
  });
});

describe("formatNumberHe", () => {
  it("groups thousands", () => {
    expect(formatNumberHe(1234567)).toMatch(/1[., ']234[., ']567/);
  });

  it("does not render null as NaN on a dashboard", () => {
    expect(formatNumberHe(null)).toBe("0");
    expect(formatNumberHe(undefined)).toBe("0");
    expect(formatNumberHe(NaN)).toBe("0");
  });

  it("leaves small numbers alone", () => {
    expect(formatNumberHe(0)).toBe("0");
    expect(formatNumberHe(42)).toBe("42");
  });
});

describe("formatAbsoluteHe", () => {
  it("still carries the time, unlike formatDateHe", () => {
    expect(formatAbsoluteHe("2026-09-02T10:30:00Z")).toMatch(/\d{1,2}:\d{2}/);
    expect(formatDateHe("2026-09-02T10:30:00Z")).not.toMatch(/:/);
  });
});
