"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

/** How long the button stays in its "copied" state. One number, everywhere. */
const COPIED_MS = 2000;

type CopyButtonVariant = "inline" | "button" | "icon";

interface CopyButtonProps {
  text: string;
  /** Visible label and accessible name. Ignored for the icon variant's label. */
  label?: string;
  variant?: CopyButtonVariant;
  className?: string;
  /** Called once the text is actually on the clipboard (analytics hooks). */
  onCopied?: () => void;
}

const VARIANT_CLASSES: Record<CopyButtonVariant, string> = {
  inline:
    "inline-flex items-center gap-1 text-xs px-2 py-1 rounded text-(--text-secondary) hover:bg-(--glass-bg) transition-colors",
  button:
    "flex items-center gap-1.5 px-3 md:px-4 py-2.5 min-h-[44px] rounded-lg border border-(--glass-border) bg-(--glass-bg) text-(--text-secondary) text-xs hover:border-amber-500/40 transition-colors",
  icon: "p-1.5 rounded-lg bg-(--glass-bg) border border-(--glass-border) hover:border-amber-500/40 transition-colors",
};

/**
 * The one copy button.
 *
 * There were three, and they disagreed about everything that matters: one
 * reset after 1500ms and two after 2000ms, one re-implemented the textarea
 * fallback that `copyText` already owns, and none of them told the user when
 * the copy was refused. A blocked clipboard write (insecure context, denied
 * permission, an unfocused document) silently did nothing while the button sat
 * there looking normal, so the user pasted whatever was in the clipboard
 * before.
 */
export function CopyButton({
  text,
  label,
  variant = "inline",
  className,
  onCopied,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const name = label ?? "העתק";

  async function handleCopy(e: React.MouseEvent) {
    // Copy buttons often sit inside a clickable card or a details row.
    e.stopPropagation();
    if (!(await copyText(text))) {
      toast.error("ההעתקה נחסמה, סמנו והעתיקו ידנית");
      return;
    }
    setCopied(true);
    onCopied?.();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), COPIED_MS);
  }

  const Icon = copied ? Check : Copy;

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={name}
      title={name}
      className={cn(VARIANT_CLASSES[variant], "cursor-pointer", className)}
    >
      <Icon className={cn("w-3.5 h-3.5 shrink-0", copied && "text-emerald-500")} />
      {variant !== "icon" && (
        <span className={cn(copied && "text-emerald-500")}>{copied ? "הועתק" : name}</span>
      )}
    </button>
  );
}
