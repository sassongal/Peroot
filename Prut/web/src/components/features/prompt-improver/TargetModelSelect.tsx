"use client";

import { useState, useRef, useEffect, useId, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TargetModel } from "@/lib/engines/types";
import { trackTargetModelSelect } from "@/lib/analytics";

const OPTIONS: {
  value: TargetModel;
  labelHe: string;
  sub: string;
  logoSrc?: string;
  triggerClass: string;
  rowClass: string;
  iconTint?: string;
}[] = [
  {
    value: "general",
    labelHe: "כללי",
    sub: "מותאם לכל מודל",
    triggerClass:
      "border-zinc-200/80 bg-zinc-50/90 dark:border-zinc-600 dark:bg-zinc-800/90",
    rowClass:
      "hover:bg-zinc-100/90 dark:hover:bg-zinc-800/80 border-zinc-100 dark:border-zinc-800",
    iconTint: "text-zinc-500 dark:text-zinc-400",
  },
  {
    value: "chatgpt",
    labelHe: "ChatGPT",
    sub: "OpenAI · מבנה Markdown והנחיות GPT",
    logoSrc: "/logos/platforms/openai.svg",
    triggerClass:
      "border-emerald-500/25 bg-emerald-500/[0.07] dark:border-emerald-400/20 dark:bg-emerald-950/40",
    rowClass:
      "hover:bg-emerald-500/10 border-emerald-500/10 dark:border-emerald-500/15",
    iconTint: "text-[#10A37F]",
  },
  {
    value: "claude",
    labelHe: "Claude",
    sub: "Anthropic · XML והקשר ארוך",
    logoSrc: "/logos/platforms/anthropic.svg",
    triggerClass:
      "border-orange-400/30 bg-orange-500/[0.08] dark:border-orange-400/25 dark:bg-orange-950/35",
    rowClass:
      "hover:bg-orange-500/10 border-orange-500/10 dark:border-orange-500/15",
    iconTint: "text-[#D97757]",
  },
  {
    value: "gemini",
    labelHe: "Gemini",
    sub: "Google · כותרות ומגבלות מפורשות",
    logoSrc: "/logos/platforms/googlegemini.svg",
    triggerClass:
      "border-blue-400/25 bg-blue-500/[0.07] dark:border-blue-400/20 dark:bg-blue-950/35",
    rowClass:
      "hover:bg-blue-500/10 border-blue-500/10 dark:border-blue-500/15",
    iconTint: "text-blue-600 dark:text-blue-400",
  },
];

const MENU_MIN_WIDTH_PX = 288; // 18rem

function optionByValue(v: TargetModel) {
  return OPTIONS.find((o) => o.value === v) ?? OPTIONS[0];
}

const TARGET_MODEL_HELP =
  "מכוון את מבנה הפרומפט המשודרג למודל שבו תריץ אותו בפועל (ChatGPT, Claude, Gemini). לא מחליף את מודל ה-AI של Peroot. «כללי» — ללא התאמה ספציפית למותג מודל.";

interface TargetModelSelectProps {
  value: TargetModel;
  onChange: (model: TargetModel) => void;
  disabled?: boolean;
}

export function TargetModelSelect({ value, onChange, disabled }: TargetModelSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const comboboxRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();
  const helpDescId = useId();
  const current = optionByValue(value);

  const syncHighlightToValue = () => {
    const idx = OPTIONS.findIndex((o) => o.value === value);
    setHighlightedIndex(idx >= 0 ? idx : 0);
  };

  const updateMenuPosition = () => {
    const el = comboboxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = typeof window !== "undefined" ? window.innerWidth : 400;
    const width = Math.min(Math.max(r.width, MENU_MIN_WIDTH_PX), vw - 16);
    let left = r.left;
    if (left + width > vw - 8) left = vw - 8 - width;
    if (left < 8) left = 8;
    setMenuPos({ top: r.bottom + 6, left, width });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    window.addEventListener("scroll", updateMenuPosition, true);
    window.addEventListener("resize", updateMenuPosition);
    return () => {
      window.removeEventListener("scroll", updateMenuPosition, true);
      window.removeEventListener("resize", updateMenuPosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const commitSelection = (next: TargetModel) => {
    if (next !== value) {
      trackTargetModelSelect(next, value);
      onChange(next);
    }
    setOpen(false);
    queueMicrotask(() => comboboxRef.current?.focus());
  };

  const handleComboboxKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        syncHighlightToValue();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) => (i + 1) % OPTIONS.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => (i - 1 + OPTIONS.length) % OPTIONS.length);
        break;
      case "Home":
        e.preventDefault();
        setHighlightedIndex(0);
        break;
      case "End":
        e.preventDefault();
        setHighlightedIndex(OPTIONS.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commitSelection(OPTIONS[highlightedIndex]!.value);
        break;
      default:
        break;
    }
  };

  const canUsePortal = typeof document !== "undefined";
  const listbox = open && canUsePortal && menuPos && (
    <>
      {/* Captures outside taps; stays under the menu */}
      <div
        role="presentation"
        className="fixed inset-0 z-9998 touch-none bg-black/25 dark:bg-black/40"
        aria-hidden
        onPointerDown={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
      />
      <ul
        id={listboxId}
        role="listbox"
        aria-label="בחירת מודל יעד"
        style={{
          top: menuPos.top,
          left: menuPos.left,
          width: menuPos.width,
        }}
        className={cn(
          "fixed z-9999 max-h-[min(70vh,22rem)] overflow-y-auto rounded-xl",
          "border border-zinc-200 dark:border-zinc-700",
          "bg-white dark:bg-zinc-950",
          "shadow-2xl shadow-black/30 ring-1 ring-black/10 dark:ring-white/10",
          "divide-y divide-zinc-200 dark:divide-zinc-800 animate-in fade-in zoom-in-95 duration-150"
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {OPTIONS.map((opt, idx) => {
          const selected = opt.value === value;
          const highlighted = open && idx === highlightedIndex;
          return (
            <li
              key={opt.value}
              id={`${listboxId}-opt-${idx}`}
              role="option"
              tabIndex={-1}
              aria-selected={selected}
              onMouseEnter={() => setHighlightedIndex(idx)}
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              onClick={() => {
                commitSelection(opt.value);
              }}
              className={cn(
                "grid w-full grid-cols-[2.25rem_1fr_1.25rem] items-center gap-2 px-3 py-3 text-start transition-colors cursor-pointer min-h-[48px]",
                opt.rowClass,
                selected && "bg-zinc-50 dark:bg-zinc-900/80",
                highlighted &&
                  "ring-2 ring-inset ring-amber-400/50 bg-amber-50/90 dark:bg-amber-950/40"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  "bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-600/80"
                )}
              >
                {opt.logoSrc ? (
                  <Image
                    src={opt.logoSrc}
                    alt=""
                    width={24}
                    height={24}
                    className={cn(
                      "object-contain",
                      opt.value === "claude" && "dark:invert"
                    )}
                  />
                ) : (
                  <Sparkles className={cn("w-5 h-5", opt.iconTint)} aria-hidden />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {opt.labelHe}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                  {opt.sub}
                </span>
              </span>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                {selected ? (
                  <Check className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );

  return (
    <div ref={rootRef} className="relative" dir="rtl">
      <span id={helpDescId} className="sr-only">
        {TARGET_MODEL_HELP}
      </span>
      <button
        ref={comboboxRef}
        type="button"
        role="combobox"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open ? `${listboxId}-opt-${highlightedIndex}` : undefined}
        aria-autocomplete="list"
        aria-describedby={helpDescId}
        title={TARGET_MODEL_HELP}
        aria-label="מודל יעד לאופטימיזציה"
        onClick={() => {
          if (disabled) return;
          if (open) {
            setOpen(false);
          } else {
            syncHighlightToValue();
            setOpen(true);
          }
        }}
        onKeyDown={handleComboboxKeyDown}
        className={cn(
          "flex items-center gap-2 min-h-[44px] ps-2.5 pe-2 rounded-xl border text-start transition-all",
          "hover:brightness-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          current.triggerClass
        )}
      >
        <span className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-white/80 dark:bg-black/30 border border-black/5 dark:border-white/10">
          {current.logoSrc ? (
            <Image
              src={current.logoSrc}
              alt=""
              width={22}
              height={22}
              className={cn(
                "object-contain",
                current.value === "claude" && "dark:invert"
              )}
            />
          ) : (
            <Sparkles className={cn("w-[18px] h-[18px]", current.iconTint)} aria-hidden />
          )}
        </span>
        <span className="flex flex-col min-w-0 leading-snug gap-0.5">
          <span className="truncate text-sm font-semibold text-(--text-primary)">
            {current.labelHe}
          </span>
          <span className="truncate text-xs text-(--text-muted) font-normal">
            {current.sub}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 shrink-0 text-(--text-muted) transition-transform",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      {listbox && createPortal(listbox, document.body)}
    </div>
  );
}
