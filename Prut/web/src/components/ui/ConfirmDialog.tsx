"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Danger styling (red confirm) for destructive actions. */
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Promise-based confirmation. `const confirm = useConfirm();` then
 * `if (!(await confirm({ title, message, danger: true }))) return;`.
 * A styled, accessible, on-brand replacement for window.confirm.
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <ConfirmDialogUI
          options={options}
          onCancel={() => settle(false)}
          onConfirm={() => settle(true)}
        />
      )}
    </ConfirmContext.Provider>
  );
}

function ConfirmDialogUI({
  options,
  onCancel,
  onConfirm,
}: {
  options: ConfirmOptions;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { title, message, confirmLabel, cancelLabel, danger } = options;
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Move focus to the confirm button on open; Esc cancels.
  useEffect(() => {
    confirmBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={message ? "confirm-message" : undefined}
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-(--glass-border) bg-[#0A0A0F] shadow-2xl p-6 animate-in fade-in zoom-in-95 motion-reduce:animate-none"
      >
        <div className="flex items-start gap-3">
          {danger && (
            <span className="shrink-0 mt-0.5 w-9 h-9 rounded-full bg-red-500/12 border border-red-500/25 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-400" aria-hidden />
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h2 id="confirm-title" className="text-base font-serif text-(--text-primary)">
              {title}
            </h2>
            {message && (
              <p id="confirm-message" className="mt-1 text-sm text-(--text-muted) leading-relaxed">
                {message}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-start gap-2">
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
              danger
                ? "bg-red-500/90 text-white hover:bg-red-500 focus-visible:ring-red-400/60"
                : "bg-amber-500 text-black hover:bg-amber-400 focus-visible:ring-amber-500/60",
            )}
          >
            {confirmLabel ?? (danger ? "מחק" : "אישור")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-(--text-secondary) border border-(--glass-border) hover:bg-(--glass-bg) hover:text-(--text-primary) transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
          >
            {cancelLabel ?? "ביטול"}
          </button>
        </div>
      </div>
    </div>
  );
}
