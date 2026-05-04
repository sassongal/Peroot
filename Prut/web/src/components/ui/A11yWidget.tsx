"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  setA11yPref,
  resetA11yPrefs,
  applyPrefsToElement,
  type A11yContrast,
  type A11yTextSize,
  type A11yLineSpacing,
} from "@/lib/a11y-prefs";
import Link from "next/link";

const CONTRAST_OPTIONS: { value: A11yContrast; label: string }[] = [
  { value: "off", label: "רגיל" },
  { value: "high", label: "גבוה" },
  { value: "invert", label: "היפוך" },
];

const TEXT_OPTIONS: { value: A11yTextSize; label: string }[] = [
  { value: 100, label: "100%" },
  { value: 115, label: "115%" },
  { value: 130, label: "130%" },
  { value: 150, label: "150%" },
];

const LINE_OPTIONS: { value: A11yLineSpacing; label: string }[] = [
  { value: "normal", label: "רגיל" },
  { value: "relaxed", label: "מרווח" },
];

function CycleCard<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const current = options.findIndex((o) => o.value === value);
  const currentLabel = options[current]?.label ?? String(value);
  return (
    <button
      type="button"
      onClick={() => onChange(options[(current + 1) % options.length].value)}
      className="flex flex-col items-center gap-1 p-3 rounded-xl border border-border bg-secondary hover:bg-white/6 transition-colors text-center"
      aria-label={`${label}: ${currentLabel}. לחץ להחלפה`}
    >
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{currentLabel}</span>
    </button>
  );
}

function ToggleCard({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={[
        "flex flex-col items-center gap-1 p-3 rounded-xl border transition-colors text-center",
        active
          ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
          : "border-border bg-secondary hover:bg-white/6 text-muted-foreground",
      ].join(" ")}
    >
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}

export function A11yWidget() {
  const [open, setOpen] = useState(false);
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const liveRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Re-apply classes after mount (safety net for blocked bootstrap scripts).
  useEffect(() => {
    applyPrefsToElement(document.documentElement, prefs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Alt+A keyboard shortcut — e.code is layout-independent.
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.code === "KeyA") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close on Escape key.
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Focus trap: cycle focus within panel while open.
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const panel = panelRef.current;
    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (!focusables.length) return;
    focusables[0].focus();

    function trap(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    panel.addEventListener("keydown", trap);
    return () => panel.removeEventListener("keydown", trap);
  }, [open]);

  function announce(msg: string) {
    if (liveRef.current) liveRef.current.textContent = msg;
  }

  const hasActivePrefs =
    prefs.contrast !== "off" ||
    prefs.textSize !== 100 ||
    prefs.lineSpacing !== "normal" ||
    prefs.reduceMotion ||
    prefs.links;

  return (
    <>
      {/* Live region outside panel so announcements survive panel close */}
      <div ref={liveRef} role="status" aria-live="polite" aria-atomic="true" className="sr-only" />

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[49] bg-black/40"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in panel from inline-start (right in RTL) */}
      <div
        id="a11y-widget-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="כלי נגישות"
        dir="rtl"
        className={[
          "fixed top-0 start-0 h-full w-72 max-w-[85vw] z-50 flex flex-col bg-background border-e border-border shadow-2xl transition-transform duration-300 overflow-y-auto",
          open ? "translate-x-0" : "rtl:translate-x-full ltr:-translate-x-full",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-foreground">כלי נגישות</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="סגור כלי נגישות"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Controls */}
        <div className="flex-1 px-5 py-4 space-y-5">
          <div className="grid grid-cols-2 gap-2">
            <CycleCard
              label="ניגודיות"
              options={CONTRAST_OPTIONS}
              value={prefs.contrast}
              onChange={(v) => {
                setA11yPref("contrast", v);
                announce(`ניגודיות: ${CONTRAST_OPTIONS.find((o) => o.value === v)?.label}`);
              }}
            />
            <CycleCard
              label="גודל טקסט"
              options={TEXT_OPTIONS}
              value={prefs.textSize}
              onChange={(v) => {
                setA11yPref("textSize", v);
                announce(`גודל טקסט: ${v}%`);
              }}
            />
            <CycleCard
              label="ריווח שורות"
              options={LINE_OPTIONS}
              value={prefs.lineSpacing}
              onChange={(v) => {
                setA11yPref("lineSpacing", v);
                announce(`ריווח שורות: ${LINE_OPTIONS.find((o) => o.value === v)?.label}`);
              }}
            />
            <ToggleCard
              label="הפחתת תנועה"
              active={prefs.reduceMotion}
              onToggle={() => {
                setA11yPref("reduceMotion", !prefs.reduceMotion);
                announce(!prefs.reduceMotion ? "הפחתת תנועה: פעיל" : "הפחתת תנועה: כבוי");
              }}
            />
            <ToggleCard
              label="הדגשת קישורים"
              active={prefs.links}
              onToggle={() => {
                setA11yPref("links", !prefs.links);
                announce(!prefs.links ? "הדגשת קישורים: פעיל" : "הדגשת קישורים: כבוי");
              }}
            />
          </div>

          {hasActivePrefs && (
            <button
              type="button"
              onClick={() => {
                resetA11yPrefs();
                announce("הגדרות הנגישות אופסו");
              }}
              className="w-full py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              איפוס הגדרות
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border shrink-0">
          <p className="text-[11px] text-muted-foreground leading-relaxed text-center">
            כלי זה מאפשר התאמות תצוגה אישיות בלבד.{" "}
            <Link
              href="/accessibility"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              הצהרת נגישות
            </Link>
          </p>
        </div>
      </div>

      {/* Floating trigger button */}
      <button
        id="a11y-widget-trigger"
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="a11y-widget-panel"
        aria-label="פתח כלי נגישות (Alt+A)"
        aria-keyshortcuts="Alt+A"
        className={[
          "fixed bottom-6 start-6 z-40 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-all",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
          hasActivePrefs
            ? "bg-amber-500 text-black hover:bg-amber-400"
            : "bg-slate-700 text-white hover:bg-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700",
        ].join(" ")}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <circle cx="12" cy="5" r="1" />
          <path d="m9 20 3-6 3 6" />
          <path d="m6 8 6 4 6-4" />
          <line x1="12" y1="12" x2="12" y2="20" />
        </svg>
      </button>
    </>
  );
}
