"use client";

import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { OUTPUT_LANGUAGES, type OutputLanguage } from "@/lib/output-language";

interface OutputLanguagePickerProps {
  value: OutputLanguage;
  onChange: (next: OutputLanguage) => void;
  /** Image and video engines produce English by design. */
  locked?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * The output-language control, out in the open.
 *
 * It used to live inside the tools drawer as a "voice language" button with
 * country flags, and in 90 days nobody used it. This is a segmented control
 * next to the mode selector, each language named in its own script. No
 * flags: a flag is a country, and Arabic is not Saudi Arabia.
 */
export function OutputLanguagePicker({
  value,
  onChange,
  locked = false,
  disabled = false,
  className,
}: OutputLanguagePickerProps) {
  const title = locked
    ? "במצבי תמונה ווידאו הפלט באנגלית, זו דרישת פלטפורמות היצירה"
    : "באיזו שפה לכתוב את הפרומפט המשודרג";

  return (
    <div
      role="radiogroup"
      aria-label="שפת הפלט"
      title={title}
      className={cn(
        "inline-flex items-center gap-0.5 p-0.5 rounded-full border border-(--glass-border) bg-(--glass-bg) max-w-full overflow-x-auto",
        (locked || disabled) && "opacity-60",
        className,
      )}
    >
      <Globe className="w-3.5 h-3.5 text-(--text-muted) ms-2 me-1 shrink-0" aria-hidden="true" />
      {OUTPUT_LANGUAGES.map((lang) => {
        const active = locked ? lang.code === "english" : lang.code === value;
        return (
          <button
            key={lang.code}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={lang.he}
            lang={lang.tag}
            dir={lang.dir}
            disabled={locked || disabled}
            onClick={() => onChange(lang.code)}
            className={cn(
              "px-2 sm:px-2.5 min-h-[32px] rounded-full text-[11px] sm:text-xs font-medium transition-colors cursor-pointer whitespace-nowrap",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
              "disabled:cursor-not-allowed",
              active
                ? "bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/40"
                : "text-(--text-muted) hover:text-(--text-primary) border border-transparent",
            )}
          >
            {lang.native}
          </button>
        );
      })}
    </div>
  );
}
